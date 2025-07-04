import { z } from "zod";

import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../procedures/authedProcedure";
import { router } from "../../trpc";
import { ZAddNotificationsSubscriptionInputSchema } from "./addNotificationsSubscription.schema";
import { ZAddSecondaryEmailInputSchema } from "./addSecondaryEmail.schema";
import { ZConnectAndJoinInputSchema } from "./connectAndJoin.schema";
import { ZEventTypeOrderInputSchema } from "./eventTypeOrder.schema";
import { ZNoShowInputSchema } from "./markNoShow.schema";
import { teamsAndUserProfilesQuery } from "./procedures/teamsAndUserProfilesQuery";
import { ZRemoveNotificationsSubscriptionInputSchema } from "./removeNotificationsSubscription.schema";
import { ZRoutingFormOrderInputSchema } from "./routingFormOrder.schema";

type AppsRouterHandlerCache = {
  stripeCustomer?: typeof import("./stripeCustomer.handler").stripeCustomerHandler;
  eventTypeOrder?: typeof import("./eventTypeOrder.handler").eventTypeOrderHandler;
  routingFormOrder?: typeof import("./routingFormOrder.handler").routingFormOrderHandler;
  teamsAndUserProfilesQuery?: typeof import("./teamsAndUserProfilesQuery.handler").teamsAndUserProfilesQuery;
  connectAndJoin?: typeof import("./connectAndJoin.handler").Handler;
  addSecondaryEmail?: typeof import("./addSecondaryEmail.handler").addSecondaryEmailHandler;
  addNotificationsSubscription?: typeof import("./addNotificationsSubscription.handler").addNotificationsSubscriptionHandler;
  removeNotificationsSubscription?: typeof import("./removeNotificationsSubscription.handler").removeNotificationsSubscriptionHandler;
  markNoShow?: typeof import("./markNoShow.handler").markNoShow;
};

export const loggedInViewerRouter = router({
  getConfig: authedProcedure.input(z.object({ eventTypeId: z.number() })).query(async ({ input }) => {
    console.log("loggedInViewerRouter.getConfig", input);
    return await prisma.aISelfServeConfiguration.findUnique({
      where: { eventTypeId: input.eventTypeId },
      include: {
        yourPhoneNumber: {
          select: {
            phoneNumber: true,
            id: true,
          },
        },
      },
    });
  }),

  setup: authedProcedure
    .input(z.object({ eventTypeId: z.number(), agentTimeZone: z.string(), calApiKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, calApiKey, agentTimeZone } = input;

      const { initialSetupLLM, createAgent } = await import(
        "@calcom/features/ee/cal-ai-phone/retellAIService"
      );

      const eventType = await prisma.eventType.findFirst({
        where: {
          id: eventTypeId,
          userId: ctx.user.id,
        },
      });

      console.log("eventType", eventType);

      if (!eventType) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const llm = await initialSetupLLM(calApiKey, agentTimeZone, eventTypeId);
      if (!llm.llm_id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create LLM." });
      }

      const agentName = `agent-for-user-${ctx.user.id}-${ctx.user.username}-${Math.floor(
        Math.random() * 10000
      )}`;
      const agent = await createAgent(llm.llm_id, agentName);
      if (!agent.agent_id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create agent." });
      }

      const config = await prisma.aISelfServeConfiguration.create({
        data: {
          eventTypeId,
          enabled: true,
          llmId: llm.llm_id,
          agentId: agent.agent_id,
          agentTimeZone,
        },
      });

      return config;
    }),
  getLlm: authedProcedure.input(z.object({ llmId: z.string() })).query(async ({ input }) => {
    const { getRetellLLM } = await import("@calcom/features/ee/cal-ai-phone/retellAIService");
    return getRetellLLM(input.llmId);
  }),
  updateLlm: authedProcedure
    .input(
      z.object({
        llmId: z.string(),
        generalPrompt: z.string().optional(),
        beginMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { updateRetellLLM } = await import("@calcom/features/ee/cal-ai-phone/retellAIService");
      const { llmId, ...updateData } = input;

      const config = await prisma.aISelfServeConfiguration.findFirst({
        where: {
          llmId: llmId,
          eventType: {
            userId: ctx.user.id,
          },
        },
      });

      if (!config) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return updateRetellLLM(llmId, updateData);
    }),
  makeSelfServePhoneCall: authedProcedure
    .input(z.object({ eventTypeId: z.number(), numberToCall: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, numberToCall } = input;

      const { handleCreateSelfServePhoneCall } = await import(
        "@calcom/features/ee/cal-ai-phone/handleCreateSelfServePhoneCall"
      );
      const call = await handleCreateSelfServePhoneCall({
        userId: ctx.user.id,
        eventTypeId,
        numberToCall,
      });
      return call;
    }),
  list: authedProcedure.query(async ({ ctx }) => {
    const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");
    return await PhoneNumberRepository.findPhoneNumbersFromUserId({ userId: ctx.user.id });
  }),
  buy: authedProcedure
    .input(z.object({ eventTypeId: z.number().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const { createPhoneNumber, updatePhoneNumber } = await import(
        "@calcom/features/ee/cal-ai-phone/retellAIService"
      );
      console.log("protectedProcedure.protectedProcedureprotectedProcedureinput", ctx, input);
      // const { eventTypeId } = input;
      // const creditService = new CreditService();
      // const creditsToCharge = 50;

      // const allCredits = await creditService.getAllCredits({ userId: ctx.user.id });
      // const availableCredits = allCredits.totalRemainingMonthlyCredits + allCredits.additionalCredits;

      // if (availableCredits < creditsToCharge) {
      //   throw new TRPCError({ code: "FORBIDDEN", message: "You don't have enough credits." });
      // }

      // // --- Database and API Calls ---
      // // 1. Charge credits first
      // const chargeResult = await creditService.chargeCredits({
      //   userId: ctx.user.id,
      //   credits: creditsToCharge,
      // });
      // if (!chargeResult) {
      //   throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to charge credits." });
      // }

      const eventTypeId = input?.eventTypeId;

      // 2. Buy the phone number
      const retellPhoneNumber = await createPhoneNumber();

      // 3. If eventTypeId is provided, assign agent to the new number
      if (eventTypeId) {
        const config = await prisma.aISelfServeConfiguration.findFirst({
          where: {
            eventTypeId: eventTypeId,
            eventType: {
              userId: ctx.user.id, // Authorization check
            },
          },
        });

        if (!config || !config.agentId) {
          // This should ideally not happen in the intended flow, but it's a good safeguard.
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "AI agent not found for this event type.",
          });
        }

        // Assign agent to the new number via Retell API
        await updatePhoneNumber(retellPhoneNumber.phone_number, config.agentId);

        // Create the number and link it in our DB
        const newNumber = await prisma.calAiPhoneNumber.create({
          data: {
            userId: ctx.user.id,
            phoneNumber: retellPhoneNumber.phone_number,
            provider: "retell",
          },
        });

        // Link the new number to the AI config
        await prisma.aISelfServeConfiguration.update({
          where: { id: config.id },
          data: { yourPhoneNumberId: newNumber.id },
        });

        return newNumber;
      }

      // --- Default behavior: Just buy the number without assignment ---
      const newNumber = await prisma.calAiPhoneNumber.create({
        data: {
          userId: ctx.user.id,
          phoneNumber: retellPhoneNumber.phone_number,
          provider: "retell",
        },
      });

      return newNumber;
    }),
  stripeCustomer: authedProcedure.query(async ({ ctx }) => {
    const { stripeCustomerHandler } = await import("./stripeCustomer.handler");
    return stripeCustomerHandler({ ctx });
  }),

  unlinkConnectedAccount: authedProcedure.mutation(async (opts) => {
    const unlinkConnectedAccountHandler = await import("./unlinkConnectedAccount.handler").then(
      (mod) => mod.default
    );
    return unlinkConnectedAccountHandler(opts);
  }),

  eventTypeOrder: authedProcedure.input(ZEventTypeOrderInputSchema).mutation(async ({ ctx, input }) => {
    const { eventTypeOrderHandler } = await import("./eventTypeOrder.handler");
    return eventTypeOrderHandler({ ctx, input });
  }),

  routingFormOrder: authedProcedure.input(ZRoutingFormOrderInputSchema).mutation(async ({ ctx, input }) => {
    const { routingFormOrderHandler } = await import("./routingFormOrder.handler");
    return routingFormOrderHandler({ ctx, input });
  }),

  teamsAndUserProfilesQuery,
  connectAndJoin: authedProcedure.input(ZConnectAndJoinInputSchema).mutation(async ({ ctx, input }) => {
    const { Handler } = await import("./connectAndJoin.handler");
    return Handler({ ctx, input });
  }),
  addSecondaryEmail: authedProcedure.input(ZAddSecondaryEmailInputSchema).mutation(async ({ ctx, input }) => {
    const { addSecondaryEmailHandler } = await import("./addSecondaryEmail.handler");
    return addSecondaryEmailHandler({ ctx, input });
  }),
  addNotificationsSubscription: authedProcedure
    .input(ZAddNotificationsSubscriptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { addNotificationsSubscriptionHandler } = await import("./addNotificationsSubscription.handler");
      return addNotificationsSubscriptionHandler({ ctx, input });
    }),
  removeNotificationsSubscription: authedProcedure
    .input(ZRemoveNotificationsSubscriptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { removeNotificationsSubscriptionHandler } = await import(
        "./removeNotificationsSubscription.handler"
      );
      return removeNotificationsSubscriptionHandler({ ctx, input });
    }),
  markNoShow: authedProcedure.input(ZNoShowInputSchema).mutation(async (opts) => {
    const { markNoShow } = await import("./markNoShow.handler");
    return markNoShow(opts);
  }),
});
