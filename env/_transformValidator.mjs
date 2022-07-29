/**
 * Transform the result of a zod scheme to another type and validates that type against another zod scheme.
 * The result of this function basically equals inputSchema.transform((val) => outputSchema.parse(transformer(val))),
 * but errors thrown during the transformation are handled gracefully (since at the moment, zod transformers
 * do not natively support exceptions).
 * @see https://github.com/colinhacks/zod/pull/420
 *
 * @template Output
 * @template Input1
 * @template Input2
 * @template Input3
 * @param {z.ZodType<Input2, any, Input1>} inputSchema
 * @param {(input: Input2) => Input3} inputTransformer
 * @param {z.ZodType<Output, any, Input3>} outputSchema
 * @param {(input: Input2) => Input3} outputTransformer
 * @returns {z.ZodEffects<z.ZodEffects<z.ZodType<Input2, any, Input1>, Input2>, Output>}
 */
export function transformValidator(inputSchema, inputTransformer, outputSchema, outputTransformer) {
  // For now we have to parse the schema twice, since transform() is not allowed to throw exceptions.
  return inputSchema
    .superRefine((val, ctx) => {
      try {
        const result = outputSchema.safeParse(inputTransformer(val));
        if (!result.success) {
          for (const issue of result.error.errors) {
            ctx.addIssue(issue);
          }
        }
      } catch (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err.message,
        });
      }
    })
    .transform((val) => outputSchema.parse(outputTransformer(val)));
}
