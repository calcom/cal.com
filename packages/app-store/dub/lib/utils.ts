import { z } from "zod";

export const dubAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uris: z.string(),
});

const dubScope = ["workspaces.read"];

export const scopeString = dubScope.join(",");
