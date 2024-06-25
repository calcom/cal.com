import { z } from "zod";

export const emailRegex =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_+-\.']*)[A-Z0-9_+'-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;

export const emailSchema = z.string().regex(emailRegex);
