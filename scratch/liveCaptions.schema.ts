import { z } from "zod";

// ── Read ──────────────────────────────────────────────────────────────────────
// No input required — the authed user's ID comes from ctx.

export const ZGetLiveCaptionsInputSchema = z.undefined();

export type TGetLiveCaptionsInputSchema = z.infer<typeof ZGetLiveCaptionsInputSchema>;

// ── Write ─────────────────────────────────────────────────────────────────────

export const ZSetLiveCaptionsInputSchema = z.object({
  liveCaptionsEnabled: z.boolean(),
});

export type TSetLiveCaptionsInputSchema = z.infer<typeof ZSetLiveCaptionsInputSchema>;
