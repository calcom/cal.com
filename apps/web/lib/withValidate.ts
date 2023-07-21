import type { AnyZodObject, Schema } from "zod";
import type { z } from "zod";

export function withValidate<T extends AnyZodObject>(action: (data: z.infer<T>) => void, schema: Schema<T>) {
  return async (formData: FormData) => {
    const parsedSchema = schema.safeParse(formData);

    if (!parsedSchema.success) {
      throw new Error("Invalid input.");
    }

    return action(parsedSchema.data);
  };
}
