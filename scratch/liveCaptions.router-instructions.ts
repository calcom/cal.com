/**
 * ROUTER REGISTRATION SNIPPET
 * ─────────────────────────────────────────────────────────────────────────────
 * After approval, add these two procedures to the router where live-captions
 * endpoints should live.
 *
 * Option A — Add to packages/trpc/server/routers/viewer/me/_router.tsx
 *   (alongside the other "me" profile procedures)
 *
 * Option B — Create a new sub-router:
 *   packages/trpc/server/routers/viewer/liveCaptions/_router.tsx
 *   and import it in the main viewerRouter.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SNIPPET to paste into the chosen router file:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * // At top of file — add these imports:
 * import { ZSetLiveCaptionsInputSchema } from "./liveCaptions.schema";
 *
 * // Inside the router({...}) object — add these two procedures:
 *
 *   getLiveCaptions: authedProcedure.query(async ({ ctx }) => {
 *     const handler = (await import("./liveCaptions.read.handler")).getLiveCaptionsHandler;
 *     return handler({ ctx });
 *   }),
 *
 *   setLiveCaptions: authedProcedure.input(ZSetLiveCaptionsInputSchema).mutation(async ({ ctx, input }) => {
 *     const handler = (await import("./liveCaptions.write.handler")).setLiveCaptionsHandler;
 *     return handler({ ctx, input });
 *   }),
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SCHEMA PATCH — packages/prisma/schema.prisma
 * ─────────────────────────────────────────────────────────────────────────────
 * Add the following field to the User model (around line 524, after autoOptInFeatures):
 *
 *   // Accessibility: enables Daily.co live captions for the user's Cal Video calls
 *   liveCaptionsEnabled Boolean @default(false)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MIGRATION COMMAND (run after schema change is approved and field is added):
 * ─────────────────────────────────────────────────────────────────────────────
 *   yarn workspace @calcom/prisma db:migration:dev --name add_live_captions_enabled
 *   yarn prisma generate
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TYPE CHECK (run before pushing):
 * ─────────────────────────────────────────────────────────────────────────────
 *   yarn type-check:ci --force
 */
