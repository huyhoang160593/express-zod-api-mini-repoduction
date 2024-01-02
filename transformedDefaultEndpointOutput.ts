import { FlatObject, ez } from "express-zod-api";
import { z } from "zod";

export function parseInteger(number: unknown, fieldName = 'number'): number {
  if (!number || typeof number !== 'string') {
    throw new Error(
      `${fieldName} is empty or is not a type that can be converted`
    );
  }
  const parseResult = parseInt(number);
  if (!isFinite(parseResult)) {
    throw new Error(`Cannot parse ${fieldName} into integer`);
  }
  return parseResult;
}
export function safeParseSuccessStatusCode(statusCode: unknown) {
  try {
    return parseInteger(statusCode);
  } catch (error) {
    return 200;
  }
}
export const transformedDefaultEndpointOutput = (output: FlatObject | null) => {
  if (!output) {
    return {
      message: `Output of this endpoints can't be empty, please recheck your code, current output: ${JSON.stringify(
        output
      )}`,
      statusCode: 500,
    };
  }
  const { statusCode, item, items } = output;
  if (item !== null && typeof item !== 'undefined') {
    return {
      statusCode: safeParseSuccessStatusCode(statusCode),
      output: item,
    };
  }
  if (Array.isArray(items)) {
    return {
      statusCode: safeParseSuccessStatusCode(statusCode),
      output: items,
    };
  }
  return {
    message: `Either 'item' or 'items' must be defined in the output schema in endpoint. Please revalidate your code`,
    statusCode: 500,
  };
};

export const NumberParamSchema = z
  .string()
  .refine(
    (paramText) => isFinite(Number(paramText)),
    (val) => ({
      message: `${val} is not a number`,
    }),
  )
  .transform((val) => parseInt(val))

export const CustomBaseSchema = z.object({
  id: z.number().nonnegative().int(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
})
export const WorkSchema = CustomBaseSchema.extend({
  shop_id: z.number().int().nonnegative(),
  // girl_id: z.number().int().nonnegative(),
  // date: z
  //   .string()
  //   .max(10),
  open_time: z.string().max(10),
  close_time: z.string().max(10),
  comment: z.string(),
  leave: z.number(),
})


const typeForPut = WorkSchema.omit({
  girl_id: true,
  created_at: true,
  updated_at: true,
  del_flg: true,
  date: true,
}).extend({
  created_at: ez.dateIn(),
  updated_at: ez.dateIn(),
  date: z
    .string()
    .regex(
      /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/,
      'must be YYYY-MM-DD',
    )
    .default('2023-11-20'),
  id: z.number().nullable().optional(),
})

export const updateWorksInput = z.object({
  girlId: NumberParamSchema,
  works: z.array(typeForPut),
})
