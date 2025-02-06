import { z } from "zod";

/** @see https://github.com/colinhacks/zod/issues/3155#issuecomment-2060045794 */
export const emailRegex =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_+-\.']*)[A-Z0-9_+'-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;

export const emailSchema = z.string().regex(emailRegex);
