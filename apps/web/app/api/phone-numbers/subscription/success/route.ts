import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

const querySchema = z.object({
  session_id: z.string().min(1),
});

const checkoutSessionMetadataSchema = z.object({
  userId: z.string().transform(Number),
  eventTypeId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  agentId: z.string().optional(),
  workflowId: z.string().optional(),
  type: z.literal("phone_number_subscription"),
});

type CheckoutSessionMetadata = z.infer<typeof checkoutSessionMetadataSchema>;

async function handler(request: NextRequest) {
  try {
    const { session_id } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    const checkoutSession = await getCheckoutSession(session_id);
    validateCheckoutSession(checkoutSession);
    const checkoutSessionMetadata = getCheckoutSessionMetadata(checkoutSession);
    console.log("checkoutSessionMetadata", checkoutSession, checkoutSessionMetadata);
    // Check if phone number already exists (in case webhook already processed it)
    const subscriptionId =
      typeof checkoutSession.subscription === "string"
        ? checkoutSession.subscription
        : checkoutSession.subscription?.id;

    if (!subscriptionId) {
      throw new HttpError({ statusCode: 400, message: "Invalid subscription data" });
    }

    const existingPhoneNumber = await prisma.calAiPhoneNumber.findFirst({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
    });

    let phoneNumber = existingPhoneNumber;

    if (!phoneNumber) {
      // Create the phone number if it doesn't exist yet
      phoneNumber = await createPhoneNumber(checkoutSession, checkoutSessionMetadata);
    }

    // If agentId is provided, link it to the agent
    if (checkoutSessionMetadata.agentId && phoneNumber) {
      try {
        // Verify the agent exists and user has permission
        const agent = await prisma.agent.findFirst({
          where: {
            id: checkoutSessionMetadata.agentId,
            OR: [
              { userId: checkoutSessionMetadata.userId },
              {
                team: {
                  members: {
                    some: {
                      userId: checkoutSessionMetadata.userId,
                      accepted: true,
                    },
                  },
                },
              },
            ],
          },
        });

        if (agent) {
          const aiService = createDefaultAIPhoneServiceProvider();

          // Assign agent to the new number via Retell API
          await aiService.updatePhoneNumber(phoneNumber.phoneNumber, {
            outbound_agent_id: agent.retellAgentId,
          });

          // Link the new number to the agent in our database
          await prisma.calAiPhoneNumber.update({
            where: { id: phoneNumber.id },
            data: {
              outboundAgent: {
                connect: { id: checkoutSessionMetadata.agentId },
              },
            },
          });
        }
      } catch (error) {
        console.error("Failed to link phone number to agent:", error);
        // Don't fail the success page if agent linking fails
      }
    }

    // Redirect based on context
    let successUrl: URL;
    if (checkoutSessionMetadata.agentId) {
      // If this was part of a workflow setup, redirect back to workflow
      if (checkoutSessionMetadata.workflowId) {
        successUrl = new URL(`${WEBAPP_URL}/workflows/${checkoutSessionMetadata.workflowId}`);
      } else {
        successUrl = new URL(`${WEBAPP_URL}/workflows`);
      }
    } else {
      // Otherwise redirect to phone numbers page
      successUrl = new URL(`${WEBAPP_URL}/settings/my-account/phone-numbers`);
    }

    successUrl.searchParams.set("success", "true");
    successUrl.searchParams.set("phone_number", phoneNumber?.phoneNumber || "");

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error("Error handling phone number subscription success:", error);

    // Redirect to phone numbers page with error
    const errorUrl = new URL(`${WEBAPP_URL}/settings/my-account/phone-numbers`);
    errorUrl.searchParams.set("error", "true");

    if (error instanceof HttpError) {
      errorUrl.searchParams.set("message", error.message);
      return NextResponse.redirect(errorUrl.toString());
    }

    errorUrl.searchParams.set("message", "An error occurred while processing your subscription");
    return NextResponse.redirect(errorUrl.toString());
  }
}

async function getCheckoutSession(sessionId: string) {
  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (!checkoutSession) {
    throw new HttpError({ statusCode: 404, message: "Checkout session not found" });
  }

  return checkoutSession;
}

function validateCheckoutSession(checkoutSession: Stripe.Response<Stripe.Checkout.Session>) {
  if (checkoutSession.payment_status !== "paid") {
    throw new HttpError({ statusCode: 402, message: "Payment required" });
  }

  if (!checkoutSession.subscription) {
    throw new HttpError({ statusCode: 400, message: "No subscription found in checkout session" });
  }
}

function getCheckoutSessionMetadata(
  checkoutSession: Stripe.Response<Stripe.Checkout.Session>
): CheckoutSessionMetadata {
  const parseCheckoutSessionMetadata = checkoutSessionMetadataSchema.safeParse(checkoutSession.metadata);

  if (!parseCheckoutSessionMetadata.success) {
    throw new HttpError({
      statusCode: 400,
      message: `Incorrect metadata in checkout session. Error: ${parseCheckoutSessionMetadata.error}`,
    });
  }

  return parseCheckoutSessionMetadata.data;
}

async function createPhoneNumber(
  checkoutSession: Stripe.Response<Stripe.Checkout.Session>,
  metadata: CheckoutSessionMetadata
) {
  const aiService = createDefaultAIPhoneServiceProvider();

  // Create the phone number through Retell API
  const retellPhoneNumber = await aiService.createPhoneNumber({
    nickname: `${metadata.userId}-${Date.now()}`,
  });

  // Extract subscription ID correctly
  const subscriptionId =
    typeof checkoutSession.subscription === "string"
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id;

  if (!subscriptionId) {
    throw new HttpError({ statusCode: 400, message: "Invalid subscription data" });
  }

  // Create the phone number in our database with subscription details
  const newNumber = await prisma.calAiPhoneNumber.create({
    data: {
      userId: metadata.userId,
      phoneNumber: retellPhoneNumber.phone_number,
      provider: "retell",
      stripeCustomerId: checkoutSession.customer as string,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
    },
  });

  return newNumber;
}

async function linkPhoneNumberToAgent(phoneNumberId: number, eventTypeId: number, userId: number) {
  const aiService = createDefaultAIPhoneServiceProvider();

  // const config = await prisma.aISelfServeConfiguration.findFirst({
  //   where: {
  //     eventTypeId: eventTypeId,
  //     eventType: {
  //       userId: userId,
  //     },
  //   },
  // });

  // if (config?.agentId) {
  //   const phoneNumber = await prisma.calAiPhoneNumber.findUnique({
  //     where: { id: phoneNumberId },
  //   });

  //   if (phoneNumber) {
  //     // Assign agent to the new number via Retell API
  //     await aiService.updatePhoneNumber(phoneNumber.phoneNumber, {
  //       inbound_agent_id: config.agentId,
  //       outbound_agent_id: config.agentId,
  //     });

  //     // Link the new number to the AI config
  //     await prisma.aISelfServeConfiguration.update({
  //       where: { id: config.id },
  //       data: { yourPhoneNumberId: phoneNumberId },
  //     });
  //   }
  // }
}

export const GET = defaultResponderForAppDir(handler);
