import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZActivateEventTypeInputSchema } from "./activateEventType.schema";
// CalId imports
import { ZCalIdActivateEventTypeInputSchema } from "./calid/activateEventType.schema";
import { ZCalIdCreateInputSchema } from "./calid/create.schema";
import { ZCalIdDeleteInputSchema } from "./calid/delete.schema";
import { ZCalIdDuplicateInputSchema } from "./calid/duplicate.schema";
import { ZCalIdFilteredListInputSchema } from "./calid/filteredList.schema";
import { ZCalIdGetInputSchema } from "./calid/get.schema";
import { ZCalIdGetAllActiveWorkflowsInputSchema } from "./calid/getAllActiveWorkflows.schema";
import { ZCalIdGetVerifiedEmailsInputSchema } from "./calid/getVerifiedEmails.schema";
import { ZCalIdGetVerifiedNumbersInputSchema } from "./calid/getVerifiedNumbers.schema";
import { ZCalIdListInputSchema } from "./calid/list.schema";
import { ZCalIdSendVerificationCodeInputSchema } from "./calid/sendVerificationCode.schema";
import { ZCalIdToggleInputSchema } from "./calid/toggle.schema";
import { ZCalIdUpdateInputSchema } from "./calid/update.schema";
import { ZCalIdVerifyEmailCodeInputSchema } from "./calid/verifyEmailCode.schema";
import { ZCalIdVerifyPhoneNumberInputSchema } from "./calid/verifyPhoneNumber.schema";
import { ZCalIdWorkflowOrderInputSchema } from "./calid/workflowOrder.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZDuplicateInputSchema } from "./duplicate.schema";
import { ZFilteredListInputSchema } from "./filteredList.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";
import { ZGetVerifiedEmailsInputSchema } from "./getVerifiedEmails.schema";
import { ZGetVerifiedNumbersInputSchema } from "./getVerifiedNumbers.schema";
import { ZCalidGetWhatsAppPhoneNumbersInputSchema } from "./getWhatsAppPhoneNumbers.schema";
import { ZCalidGetWhatsAppTemplatesInputSchema } from "./getWhatsAppTemplates.schema";
import { ZListInputSchema } from "./list.schema";
import { ZSendVerificationCodeInputSchema } from "./sendVerificationCode.schema";
import { ZToggleInputSchema } from "./toggle.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZVerifyEmailCodeInputSchema } from "./verifyEmailCode.schema";
import { ZVerifyPhoneNumberInputSchema } from "./verifyPhoneNumber.schema";
import { ZWorkflowOrderInputSchema } from "./workflowOrder.schema";

type WorkflowsRouterHandlerCache = {
  list?: typeof import("./list.handler").listHandler;
  get?: typeof import("./get.handler").getHandler;
  create?: typeof import("./create.handler").createHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  update?: typeof import("./update.handler").updateHandler;
  activateEventType?: typeof import("./activateEventType.handler").activateEventTypeHandler;
  sendVerificationCode?: typeof import("./sendVerificationCode.handler").sendVerificationCodeHandler;
  verifyPhoneNumber?: typeof import("./verifyPhoneNumber.handler").verifyPhoneNumberHandler;
  getVerifiedNumbers?: typeof import("./getVerifiedNumbers.handler").getVerifiedNumbersHandler;
  getWorkflowActionOptions?: typeof import("./getWorkflowActionOptions.handler").getWorkflowActionOptionsHandler;
  filteredList?: typeof import("./filteredList.handler").filteredListHandler;
  getVerifiedEmails?: typeof import("./getVerifiedEmails.handler").getVerifiedEmailsHandler;
  verifyEmailCode?: typeof import("./verifyEmailCode.handler").verifyEmailCodeHandler;
  getAllActiveWorkflows?: typeof import("./getAllActiveWorkflows.handler").getAllActiveWorkflowsHandler;
  workflowOrder?: typeof import("./workflowOrder.handler").workflowOrderHandler;
  toggle?: typeof import("./toggle.handler").toggleHandler;
  duplicate?: typeof import("./duplicate.handler").duplicateHandler;

  // CalId handlers
  calid_list?: typeof import("./calid/list.handler").calIdListHandler;
  calid_get?: typeof import("./calid/get.handler").calIdGetHandler;
  calid_create?: typeof import("./calid/create.handler").calIdCreateHandler;
  calid_delete?: typeof import("./calid/delete.handler").calIdDeleteHandler;
  calid_update?: typeof import("./calid/update.handler").calIdUpdateHandler;
  calid_activateEventType?: typeof import("./calid/activateEventType.handler").calIdActivateEventTypeHandler;
  calid_sendVerificationCode?: typeof import("./calid/sendVerificationCode.handler").calIdSendVerificationCodeHandler;
  calid_verifyPhoneNumber?: typeof import("./calid/verifyPhoneNumber.handler").calIdVerifyPhoneNumberHandler;
  calid_getVerifiedNumbers?: typeof import("./calid/getVerifiedNumbers.handler").calIdGetVerifiedNumbersHandler;
  calid_getWorkflowActionOptions?: typeof import("./calid/getWorkflowActionOptions.handler").calIdGetWorkflowActionOptionsHandler;
  calid_filteredList?: typeof import("./calid/filteredList.handler").calIdFilteredListHandler;
  calid_getVerifiedEmails?: typeof import("./calid/getVerifiedEmails.handler").calIdGetVerifiedEmailsHandler;
  calid_verifyEmailCode?: typeof import("./calid/verifyEmailCode.handler").calIdVerifyEmailCodeHandler;
  calid_getAllActiveWorkflows?: typeof import("./calid/getAllActiveWorkflows.handler").calIdGetAllActiveWorkflowsHandler;
  calid_workflowOrder?: typeof import("./calid/workflowOrder.handler").calIdWorkflowOrderHandler;
  calid_toggle?: typeof import("./calid/toggle.handler").calIdToggleHandler;
  calid_duplicate?: typeof import("./calid/duplicate.handler").calIdDuplicateHandler;
  getWhatsAppPhoneNumbers: typeof import("./getWhatsAppPhoneNumbers.handler").getWhatsAppPhoneNumbersHandler;
  getWhatsAppTemplates: typeof import("./getWhatsAppTemplates.handler").getWhatsAppTemplatesHandler;
};

const UNSTABLE_HANDLER_CACHE: WorkflowsRouterHandlerCache = {};

export const workflowsRouter = router({
  // Original handlers
  list: authedProcedure.input(ZListInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.list) {
      UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then((mod) => mod.listHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.list) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.list({
      ctx,
      input,
    });
  }),

  get: authedProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.get) {
      UNSTABLE_HANDLER_CACHE.get = await import("./get.handler").then((mod) => mod.getHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.get) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.get({
      ctx,
      input,
    });
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.create) {
      UNSTABLE_HANDLER_CACHE.create = await import("./create.handler").then((mod) => mod.createHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.create) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.create({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      UNSTABLE_HANDLER_CACHE.delete = await import("./delete.handler").then((mod) => mod.deleteHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.delete) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.delete({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.update) {
      UNSTABLE_HANDLER_CACHE.update = await import("./update.handler").then((mod) => mod.updateHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.update) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.update({
      ctx,
      input,
    });
  }),

  toggle: authedProcedure.input(ZToggleInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.toggle) {
      UNSTABLE_HANDLER_CACHE.toggle = await import("./toggle.handler").then((mod) => mod.toggleHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.toggle) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.toggle({
      ctx,
      input,
    });
  }),

  duplicate: authedProcedure.input(ZDuplicateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.duplicate) {
      UNSTABLE_HANDLER_CACHE.duplicate = await import("./duplicate.handler").then(
        (mod) => mod.duplicateHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.duplicate) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.duplicate({
      ctx,
      input,
    });
  }),

  activateEventType: authedProcedure.input(ZActivateEventTypeInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.activateEventType) {
      UNSTABLE_HANDLER_CACHE.activateEventType = await import("./activateEventType.handler").then(
        (mod) => mod.activateEventTypeHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.activateEventType) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.activateEventType({
      ctx,
      input,
    });
  }),

  sendVerificationCode: authedProcedure
    .input(ZSendVerificationCodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.sendVerificationCode) {
        UNSTABLE_HANDLER_CACHE.sendVerificationCode = await import("./sendVerificationCode.handler").then(
          (mod) => mod.sendVerificationCodeHandler
        );
      }

      if (!UNSTABLE_HANDLER_CACHE.sendVerificationCode) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.sendVerificationCode({
        ctx,
        input,
      });
    }),

  verifyPhoneNumber: authedProcedure.input(ZVerifyPhoneNumberInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.verifyPhoneNumber) {
      UNSTABLE_HANDLER_CACHE.verifyPhoneNumber = await import("./verifyPhoneNumber.handler").then(
        (mod) => mod.verifyPhoneNumberHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.verifyPhoneNumber) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.verifyPhoneNumber({
      ctx,
      input,
    });
  }),

  getVerifiedNumbers: authedProcedure.input(ZGetVerifiedNumbersInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.getVerifiedNumbers) {
      UNSTABLE_HANDLER_CACHE.getVerifiedNumbers = await import("./getVerifiedNumbers.handler").then(
        (mod) => mod.getVerifiedNumbersHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.getVerifiedNumbers) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getVerifiedNumbers({
      ctx,
      input,
    });
  }),

  getVerifiedEmails: authedProcedure.input(ZGetVerifiedEmailsInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.getVerifiedEmails) {
      UNSTABLE_HANDLER_CACHE.getVerifiedEmails = await import("./getVerifiedEmails.handler").then(
        (mod) => mod.getVerifiedEmailsHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.getVerifiedEmails) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getVerifiedEmails({
      ctx,
      input,
    });
  }),

  verifyEmailCode: authedProcedure.input(ZVerifyEmailCodeInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.verifyEmailCode) {
      UNSTABLE_HANDLER_CACHE.verifyEmailCode = await import("./verifyEmailCode.handler").then(
        (mod) => mod.verifyEmailCodeHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.verifyEmailCode) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.verifyEmailCode({
      ctx,
      input,
    });
  }),

  getWorkflowActionOptions: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getWorkflowActionOptions) {
      UNSTABLE_HANDLER_CACHE.getWorkflowActionOptions = await import(
        "./getWorkflowActionOptions.handler"
      ).then((mod) => mod.getWorkflowActionOptionsHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.getWorkflowActionOptions) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getWorkflowActionOptions({
      ctx,
    });
  }),

  filteredList: authedProcedure.input(ZFilteredListInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.filteredList) {
      UNSTABLE_HANDLER_CACHE.filteredList = await import("./filteredList.handler").then(
        (mod) => mod.filteredListHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.filteredList) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.filteredList({
      ctx,
      input,
    });
  }),

  getAllActiveWorkflows: authedProcedure
    .input(ZGetAllActiveWorkflowsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getAllActiveWorkflows) {
        UNSTABLE_HANDLER_CACHE.getAllActiveWorkflows = await import("./getAllActiveWorkflows.handler").then(
          (mod) => mod.getAllActiveWorkflowsHandler
        );
      }

      if (!UNSTABLE_HANDLER_CACHE.getAllActiveWorkflows) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getAllActiveWorkflows({
        ctx,
        input,
      });
    }),

  workflowOrder: authedProcedure.input(ZWorkflowOrderInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.workflowOrder) {
      UNSTABLE_HANDLER_CACHE.workflowOrder = (await import("./workflowOrder.handler")).workflowOrderHandler;
    }

    if (!UNSTABLE_HANDLER_CACHE.workflowOrder) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.workflowOrder({ ctx, input });
  }),

  // CalId handlers with "calid_" prefix
  calid_list: authedProcedure.input(ZCalIdListInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_list) {
      UNSTABLE_HANDLER_CACHE.calid_list = await import("./calid/list.handler").then(
        (mod) => mod.calIdListHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_list) {
      throw new Error("Failed to load CalId list handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_list({
      ctx,
      input,
    });
  }),

  calid_get: authedProcedure.input(ZCalIdGetInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_get) {
      UNSTABLE_HANDLER_CACHE.calid_get = await import("./calid/get.handler").then(
        (mod) => mod.calIdGetHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_get) {
      throw new Error("Failed to load CalId get handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_get({
      ctx,
      input,
    });
  }),

  calid_create: authedProcedure.input(ZCalIdCreateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_create) {
      UNSTABLE_HANDLER_CACHE.calid_create = await import("./calid/create.handler").then(
        (mod) => mod.calIdCreateHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_create) {
      throw new Error("Failed to load CalId create handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_create({
      ctx,
      input,
    });
  }),

  calid_delete: authedProcedure.input(ZCalIdDeleteInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_delete) {
      UNSTABLE_HANDLER_CACHE.calid_delete = await import("./calid/delete.handler").then(
        (mod) => mod.calIdDeleteHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_delete) {
      throw new Error("Failed to load CalId delete handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_delete({
      ctx,
      input,
    });
  }),

  calid_update: authedProcedure.input(ZCalIdUpdateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_update) {
      UNSTABLE_HANDLER_CACHE.calid_update = await import("./calid/update.handler").then(
        (mod) => mod.calIdUpdateHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_update) {
      throw new Error("Failed to load CalId update handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_update({
      ctx,
      input,
    });
  }),

  calid_toggle: authedProcedure.input(ZCalIdToggleInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_toggle) {
      UNSTABLE_HANDLER_CACHE.calid_toggle = await import("./calid/toggle.handler").then(
        (mod) => mod.calIdToggleHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_toggle) {
      throw new Error("Failed to load CalId toggle handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_toggle({
      ctx,
      input,
    });
  }),

  calid_duplicate: authedProcedure.input(ZCalIdDuplicateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_duplicate) {
      UNSTABLE_HANDLER_CACHE.calid_duplicate = await import("./calid/duplicate.handler").then(
        (mod) => mod.calIdDuplicateHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_duplicate) {
      throw new Error("Failed to load CalId duplicate handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_duplicate({
      ctx,
      input,
    });
  }),

  calid_activateEventType: authedProcedure
    .input(ZCalIdActivateEventTypeInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_activateEventType) {
        UNSTABLE_HANDLER_CACHE.calid_activateEventType = await import(
          "./calid/activateEventType.handler"
        ).then((mod) => mod.calIdActivateEventTypeHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.calid_activateEventType) {
        throw new Error("Failed to load CalId activateEventType handler");
      }

      return UNSTABLE_HANDLER_CACHE.calid_activateEventType({
        ctx,
        input,
      });
    }),

  calid_sendVerificationCode: authedProcedure
    .input(ZCalIdSendVerificationCodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_sendVerificationCode) {
        UNSTABLE_HANDLER_CACHE.calid_sendVerificationCode = await import(
          "./calid/sendVerificationCode.handler"
        ).then((mod) => mod.calIdSendVerificationCodeHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.calid_sendVerificationCode) {
        throw new Error("Failed to load CalId sendVerificationCode handler");
      }

      return UNSTABLE_HANDLER_CACHE.calid_sendVerificationCode({
        ctx,
        input,
      });
    }),

  calid_verifyPhoneNumber: authedProcedure
    .input(ZCalIdVerifyPhoneNumberInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_verifyPhoneNumber) {
        UNSTABLE_HANDLER_CACHE.calid_verifyPhoneNumber = await import(
          "./calid/verifyPhoneNumber.handler"
        ).then((mod) => mod.calIdVerifyPhoneNumberHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.calid_verifyPhoneNumber) {
        throw new Error("Failed to load CalId verifyPhoneNumber handler");
      }

      return UNSTABLE_HANDLER_CACHE.calid_verifyPhoneNumber({
        ctx,
        input,
      });
    }),

  calid_getVerifiedNumbers: authedProcedure
    .input(ZCalIdGetVerifiedNumbersInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_getVerifiedNumbers) {
        UNSTABLE_HANDLER_CACHE.calid_getVerifiedNumbers = await import(
          "./calid/getVerifiedNumbers.handler"
        ).then((mod) => mod.calIdGetVerifiedNumbersHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.calid_getVerifiedNumbers) {
        throw new Error("Failed to load CalId getVerifiedNumbers handler");
      }

      return UNSTABLE_HANDLER_CACHE.calid_getVerifiedNumbers({
        ctx,
        input,
      });
    }),

  calid_getVerifiedEmails: authedProcedure
    .input(ZCalIdGetVerifiedEmailsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_getVerifiedEmails) {
        UNSTABLE_HANDLER_CACHE.calid_getVerifiedEmails = await import(
          "./calid/getVerifiedEmails.handler"
        ).then((mod) => mod.calIdGetVerifiedEmailsHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.calid_getVerifiedEmails) {
        throw new Error("Failed to load CalId getVerifiedEmails handler");
      }

      return UNSTABLE_HANDLER_CACHE.calid_getVerifiedEmails({
        ctx,
        input,
      });
    }),

  calid_verifyEmailCode: authedProcedure
    .input(ZCalIdVerifyEmailCodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_verifyEmailCode) {
        UNSTABLE_HANDLER_CACHE.calid_verifyEmailCode = await import("./calid/verifyEmailCode.handler").then(
          (mod) => mod.calIdVerifyEmailCodeHandler
        );
      }

      if (!UNSTABLE_HANDLER_CACHE.calid_verifyEmailCode) {
        throw new Error("Failed to load CalId verifyEmailCode handler");
      }

      return UNSTABLE_HANDLER_CACHE.calid_verifyEmailCode({
        ctx,
        input,
      });
    }),

  calid_getWorkflowActionOptions: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_getWorkflowActionOptions) {
      UNSTABLE_HANDLER_CACHE.calid_getWorkflowActionOptions = await import(
        "./calid/getWorkflowActionOptions.handler"
      ).then((mod) => mod.calIdGetWorkflowActionOptionsHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_getWorkflowActionOptions) {
      throw new Error("Failed to load CalId getWorkflowActionOptions handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_getWorkflowActionOptions({
      ctx,
    });
  }),

  calid_filteredList: authedProcedure.input(ZCalIdFilteredListInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.calid_filteredList) {
      UNSTABLE_HANDLER_CACHE.calid_filteredList = await import("./calid/filteredList.handler").then(
        (mod) => mod.calIdFilteredListHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.calid_filteredList) {
      throw new Error("Failed to load CalId filteredList handler");
    }

    return UNSTABLE_HANDLER_CACHE.calid_filteredList({
      ctx,
      input,
    });
  }),

  calid_getAllActiveWorkflows: authedProcedure
    .input(ZCalIdGetAllActiveWorkflowsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_getAllActiveWorkflows) {
        UNSTABLE_HANDLER_CACHE.calid_getAllActiveWorkflows = await import(
          "./calid/getAllActiveWorkflows.handler"
        ).then((mod) => mod.calIdGetAllActiveWorkflowsHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.calid_getAllActiveWorkflows) {
        throw new Error("Failed to load CalId getAllActiveWorkflows handler");
      }

      return UNSTABLE_HANDLER_CACHE.calid_getAllActiveWorkflows({
        ctx,
        input,
      });
    }),

  calid_workflowOrder: authedProcedure
    .input(ZCalIdWorkflowOrderInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.calid_workflowOrder) {
        UNSTABLE_HANDLER_CACHE.calid_workflowOrder = (
          await import("./calid/workflowOrder.handler")
        ).calIdWorkflowOrderHandler;
      }

      if (!UNSTABLE_HANDLER_CACHE.calid_workflowOrder) {
        throw new Error("Failed to load CalId workflowOrder handler");
      }

      return UNSTABLE_HANDLER_CACHE.calid_workflowOrder({ ctx, input });
    }),

  getWhatsAppPhoneNumbers: authedProcedure
    .input(ZCalidGetWhatsAppPhoneNumbersInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getWhatsAppPhoneNumbers) {
        UNSTABLE_HANDLER_CACHE.getWhatsAppPhoneNumbers = await import(
          "./getWhatsAppPhoneNumbers.handler"
        ).then((mod) => mod.getWhatsAppPhoneNumbersHandler);
      }
      if (!UNSTABLE_HANDLER_CACHE.getWhatsAppPhoneNumbers) {
        throw new Error("Failed to load handler");
      }
      return UNSTABLE_HANDLER_CACHE.getWhatsAppPhoneNumbers({ ctx, input });
    }),

  getWhatsAppTemplates: authedProcedure
    .input(ZCalidGetWhatsAppTemplatesInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getWhatsAppTemplates) {
        UNSTABLE_HANDLER_CACHE.getWhatsAppTemplates = await import("./getWhatsAppTemplates.handler").then(
          (mod) => mod.getWhatsAppTemplatesHandler
        );
      }
      if (!UNSTABLE_HANDLER_CACHE.getWhatsAppTemplates) {
        throw new Error("Failed to load handler");
      }
      return UNSTABLE_HANDLER_CACHE.getWhatsAppTemplates({ ctx, input });
    }),
});
