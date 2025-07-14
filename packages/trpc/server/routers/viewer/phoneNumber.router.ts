// import { CreditService } from "@calcom/features/ee/billing/credit-service";
// import { createPhoneNumber, updatePhoneNumber } from "@calcom/features/ee/cal-ai-phone/retellAIService";
// import { TRPCError } from "@trpc/server";
import { router } from "../../trpc";

export const phoneNumberRouter = router({
  // list: authedProcedure.query(async ({ ctx }) => {
  //   const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");
  //   return await PhoneNumberRepository.findPhoneNumbersFromUserId({ userId: ctx.user.id });
  // }),
  // buy: authedProcedure
  //   .input(z.object({ eventTypeId: z.number().optional() }).optional())
  //   .mutation(async ({ ctx, input }) => {
  //     const { createPhoneNumber, updatePhoneNumber } = await import(
  //       "@calcom/features/ee/cal-ai-phone/retellAIService"
  //     );
  //     console.log("protectedProcedure.protectedProcedureprotectedProcedureinput", ctx, input);
  //     // const { eventTypeId } = input;
  //     // const creditService = new CreditService();
  //     // const creditsToCharge = 50;
  //     // const allCredits = await creditService.getAllCredits({ userId: ctx.user.id });
  //     // const availableCredits = allCredits.totalRemainingMonthlyCredits + allCredits.additionalCredits;
  //     // if (availableCredits < creditsToCharge) {
  //     //   throw new TRPCError({ code: "FORBIDDEN", message: "You don't have enough credits." });
  //     // }
  //     // // --- Database and API Calls ---
  //     // // 1. Charge credits first
  //     // const chargeResult = await creditService.chargeCredits({
  //     //   userId: ctx.user.id,
  //     //   credits: creditsToCharge,
  //     // });
  //     // if (!chargeResult) {
  //     //   throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to charge credits." });
  //     // }
  //     const eventTypeId = input?.eventTypeId;
  //     // 2. Buy the phone number
  //     const retellPhoneNumber = await createPhoneNumber();
  //     // 3. If eventTypeId is provided, assign agent to the new number
  //     if (eventTypeId) {
  //       const { AISelfServeConfigurationRepository } = await import(
  //         "@calcom/lib/server/repository/aiSelfServeConfiguration"
  //       );
  //       const config = await AISelfServeConfigurationRepository.findByEventTypeIdAndUserId({
  //         eventTypeId: eventTypeId,
  //         userId: ctx.user.id,
  //       });
  //       if (!config || !config.agentId) {
  //         // This should ideally not happen in the intended flow, but it's a good safeguard.
  //         throw new TRPCError({
  //           code: "BAD_REQUEST",
  //           message: "AI agent not found for this event type.",
  //         });
  //       }
  //       // Assign agent to the new number via Retell API
  //       await updatePhoneNumber(retellPhoneNumber.phone_number, config.agentId);
  //       // Create the number and link it in our DB
  //       const newNumber = await prisma.calAiPhoneNumber.create({
  //         data: {
  //           userId: ctx.user.id,
  //           phoneNumber: retellPhoneNumber.phone_number,
  //           provider: "retell",
  //         },
  //       });
  //       // Link the new number to the AI config
  //       await AISelfServeConfigurationRepository.updatePhoneNumberAssignment({
  //         configId: config.id,
  //         yourPhoneNumberId: newNumber.id,
  //       });
  //       return newNumber;
  //     }
  //     // --- Default behavior: Just buy the number without assignment ---
  //     const newNumber = await prisma.calAiPhoneNumber.create({
  //       data: {
  //         userId: ctx.user.id,
  //         phoneNumber: retellPhoneNumber.phone_number,
  //         provider: "retell",
  //       },
  //     });
  //     return newNumber;
  //   }),
});
