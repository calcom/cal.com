import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZActivateEventTypeInputSchema } from "./activateEventType.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZFilteredListInputSchema } from "./filteredList.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";
import { ZGetVerifiedEmailsInputSchema } from "./getVerifiedEmails.schema";
import { ZGetVerifiedNumbersInputSchema } from "./getVerifiedNumbers.schema";
import { ZListInputSchema } from "./list.schema";
import { ZSendVerificationCodeInputSchema } from "./sendVerificationCode.schema";
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
};

const UNSTABLE_HANDLER_CACHE: WorkflowsRouterHandlerCache = {};

export const workflowsRouter = router({
  list: authedProcedure.input(ZListInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.list) {
      UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then((mod) => mod.listHandler);
    }

    // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.update) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.update({
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

    // Unreachable code but required for type safety
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

      // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getVerifiedEmails) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getVerifiedEmails({
      ctx,
      input,
    });
  }),

  verifyEmailCode: authedProcedure.input(ZVerifyEmailCodeInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.verifyPhoneNumber) {
      UNSTABLE_HANDLER_CACHE.verifyEmailCode = await import("./verifyEmailCode.handler").then(
        (mod) => mod.verifyEmailCodeHandler
      );
    }

    // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
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

      // Unreachable code but required for type safety
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

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.workflowOrder) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.workflowOrder({ ctx, input });
  }),
});
