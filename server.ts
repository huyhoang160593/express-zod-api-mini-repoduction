import { DependsOnMethod, Documentation, EndpointsFactory, IOSchema, attachRouting, createConfig, createResultHandler, getExamples, getMessageFromError, getStatusCodeFromError, withMeta } from "express-zod-api";
import { ZodArray, ZodTypeAny, z } from "zod";
import { Routing } from "express-zod-api";
import express from "express";
import { transformedDefaultEndpointOutput, updateWorksInput } from "./transformedDefaultEndpointOutput";
import { apiReference } from "@scalar/express-api-reference";

const app = express()
const config = createConfig({
  app,
  cors: true,
  logger: { level: "debug", color: true },
})
app.use(express.json())

export const defaultEndpointFactory = new EndpointsFactory(
  createResultHandler({
    getPositiveResponse: (output: IOSchema) => {
      const examples = getExamples({ schema: output })
      if (!('shape' in output)) {
        return output
      }
      if ('item' in output.shape) {
        const transformOutputSchema = output.shape.item as ZodTypeAny
        const responseSchema = withMeta(transformOutputSchema)
        return examples.reduce<typeof responseSchema>(
          (acc, example) =>
            example && typeof example === 'object' && 'item' in example
              ? acc.example(example.item)
              : acc,
          responseSchema,
        )
      }
      if ('items' in output.shape && output.shape.items instanceof z.ZodArray) {
        const transformOutputSchema = output.shape.items as ZodArray<ZodTypeAny>
        const responseSchema = withMeta(transformOutputSchema)
        return examples.reduce<typeof responseSchema>(
          (acc, example) =>
            example &&
            typeof example === 'object' &&
            'items' in example &&
            Array.isArray(example.items)
              ? acc.example(example.items)
              : acc,
          responseSchema,
        )
      }
      return z.object({
        message: z.literal(
          "Either 'item' or 'items' must be defined in the output schema. Please recheck the endpoint code",
        ),
      })
    },
    getNegativeResponse: () => [{
        statusCode: 400,
        schema: z.object({ status: z.literal("Bad Request") }),
      },
      {
        statusCode: 401,
        schema: z.object({ status: z.literal("Unauthorizie") }),
      }
    ],
    handler: ({ error, response, output, logger }) => {
      if (!error) {
        const transformedOutput = transformedDefaultEndpointOutput(output)
        if (transformedOutput.message) {
          response.status(transformedOutput.statusCode).json({
            message: transformedOutput.message,
          })
          return
        }
        response
          .status(transformedOutput.statusCode)
          .json(transformedOutput.output)
        return
      }

      let statusCode = getStatusCodeFromError(error)
      if (statusCode === 500) {
        statusCode = 400
      }
      const message = getMessageFromError(error)
      response.status(statusCode).json({
        message,
      })
    },
  }),
)

const helloWorldEndpoint = defaultEndpointFactory.build({
  method: 'put', // or methods: ["get", "post", ...]
  input: withMeta(updateWorksInput).example({
    girlId: '12',
    works: [{
      close_time: '2020-12-13',
      comment: 'this is a comment',
      leave: 10,
      open_time: '2020-12-13',
      created_at: '2023-12-07T08:24:39.634Z',
      updated_at: '2023-12-07T08:24:39.634Z',
      date: '2020-12-13',
      shop_id: 25,
      id: 12
    }]
  }),
  output: z.object({
    item: z.string(),
  }),
  handler: async ({ input, options, logger }) => {
    logger.debug("Options:", options); // middlewares provide options
    return { item: `Hello, World. Happy coding!` };
  },
});

const routing: Routing = {
  work: {
    hello: {
      ":myId": new DependsOnMethod({
        put: helloWorldEndpoint
      })
    }
  },
};

const jsonString = new Documentation({
  routing, // the same routing and config that you use to start the server
  config,
  version: "1.2.3",
  title: "Example API",
  serverUrl: "https://example.com",
  composition: "inline", // optional, or "components" for keeping schemas in a separate dedicated section using refs
}).getSpecAsJson();


(async ()=> {
  app.use('/documentation', apiReference({
    spec: {
      content: jsonString
    }
  }))

  const {notFoundHandler, logger} = await attachRouting(config, routing);

  app.use(notFoundHandler)

  app.listen(8090)
  logger.info("server listen on port 8090")
})()
