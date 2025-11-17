import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCalidGetWhatsAppPhoneNumbersInputSchema } from "./calid_getWhatsAppPhoneNumbersInput.schema";
import { ZCalidGetWhatsAppTemplatesInputSchema } from "./calid_getWhatsAppTemplatesInput.schema";

type WhatsAppBusinessRouterHandlerCache = {
  calid_getWhatsAppPhoneNumbers?: typeof import("./calid_getWhatsAppPhoneNumbers.handler").calid_getWhatsAppPhoneNumbersHandler;
  calid_getWhatsAppTemplates?: typeof import("./calid_getWhatsAppTemplates.handler").calid_getWhatsAppTemplatesHandler;
};

const UNSTABLE_HANDLER_CACHE: WhatsAppBusinessRouterHandlerCache = {};

export const whatsappBusinessRouter = router({
  calid_getWhatsAppPhoneNumbers: authedProcedure
    .input(ZCalidGetWhatsAppPhoneNumbersInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_getWhatsAppPhoneNumbers) {
        UNSTABLE_HANDLER_CACHE.calid_getWhatsAppPhoneNumbers = await import(
          "./calid/getWhatsAppPhoneNumbers.handler"
        ).then((mod) => mod.default);
      }
      if (!UNSTABLE_HANDLER_CACHE.calid_getWhatsAppPhoneNumbers) {
        throw new Error("Failed to load handler");
      }
      return UNSTABLE_HANDLER_CACHE.calid_getWhatsAppPhoneNumbers({ ctx, input });
    }),

  calid_getWhatsAppTemplates: authedProcedure
    .input(ZCalidGetWhatsAppTemplatesInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_getWhatsAppTemplates) {
        UNSTABLE_HANDLER_CACHE.calid_getWhatsAppTemplates = await import(
          "./calid/getWhatsAppTemplates.handler"
        ).then((mod) => mod.default);
      }
      if (!UNSTABLE_HANDLER_CACHE.calid_getWhatsAppTemplates) {
        throw new Error("Failed to load handler");
      }
      return UNSTABLE_HANDLER_CACHE.calid_getWhatsAppTemplates({ ctx, input });
    }),
});
