import { createZodDto } from "nestjs-zod";
import { z } from "nestjs-zod/z";

export const UpdateOAuthClientSchema = z.object({
  logo: z.string().optional(),
  name: z.string().optional(),
  redirect_uris: z.array(z.string()).optional(),
  permissions: z.number().optional(),
});

export class UpdateOAuthClientDto extends createZodDto(UpdateOAuthClientSchema) {}
