import type { NextApiRequest } from "next";

import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { getDubCustomer } from "@calcom/features/auth/lib/dub";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { schemaMembershipPublic } from "~/lib/validations/membership";
import { schemaTeamCreateBodyParams, schemaTeamReadPublic } from "~/lib/validations/team";

/**
 * @swagger
 * /teams:
 *   post:
 *     operationId: addTeam
 *     summary: Creates a new team
 *     parameters:
 *        - in: query
 *          name: apiKey
 *          required: true
 *          schema:
 *            type: string
 *          description: Your API key
 *     requestBody:
 *        description: Create a new custom input for an event type
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - name
 *                - slug
 *                - hideBookATeamMember
 *                - brandColor
 *                - darkBrandColor
 *                - timeZone
 *                - weekStart
 *                - isPrivate
 *              properties:
 *                name:
 *                  type: string
 *                  description: Name of the team
 *                slug:
 *                  type: string
 *                  description: A unique slug that works as path for the team public page
 *                hideBookATeamMember:
 *                  type: boolean
 *                  description: Flag to hide or show the book a team member option
 *                brandColor:
 *                  type: string
 *                  description: Primary brand color for the team
 *                darkBrandColor:
 *                  type: string
 *                  description: Dark variant of the primary brand color for the team
 *                timeZone:
 *                  type: string
 *                  description: Time zone of the team
 *                weekStart:
 *                  type: string
 *                  description: Starting day of the week for the team
 *                isPrivate:
 *                  type: boolean
 *                  description: Flag indicating if the team is private
 *                ownerId:
 *                  type: number
 *                  description: ID of the team owner - only admins can set this.
 *                parentId:
 *                  type: number
 *                  description: ID of the parent organization.
 *     tags:
 *     - teams
 *     responses:
 *       201:
 *         description: OK, team created
 *       400:
 *        description: Bad request. Team body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { body, userId, isSystemWideAdmin } = req;
  const { ownerId, ...data } = schemaTeamCreateBodyParams.parse(body);

  await checkPermissions(req);

  const effectiveUserId = isSystemWideAdmin && ownerId ? ownerId : userId;

  if (data.slug) {
    const alreadyExist = await prisma.team.findFirst({
      where: {
        slug: {
          mode: "insensitive",
          equals: data.slug,
        },
      },
    });
    if (alreadyExist) throw new HttpError({ statusCode: 409, message: "Team slug already exists" });
  }

  // Check if parentId is related to this user and is an organization
  if (data.parentId) {
    const parentTeam = await prisma.team.findFirst({
      where: { id: data.parentId, members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } },
    });
    if (!parentTeam)
      throw new HttpError({
        statusCode: 401,
        message: "Unauthorized: Invalid parent id. You can only use parent id if you are org owner or admin.",
      });

    if (parentTeam.parentId)
      throw new HttpError({
        statusCode: 400,
        message: "parentId must be of an organization, not a team.",
      });
  }

  // TODO: Perhaps there is a better fix for this?
  const cloneData: typeof data & {
    metadata: NonNullable<typeof data.metadata> | undefined;
    bookingLimits: NonNullable<typeof data.bookingLimits> | undefined;
  } = {
    ...data,
    smsLockReviewedByAdmin: false,
    bookingLimits: data.bookingLimits === null ? {} : data.bookingLimits || undefined,
    metadata: data.metadata === null ? {} : data.metadata || undefined,
  };

  if (!IS_TEAM_BILLING_ENABLED || data.parentId) {
    const team = await prisma.team.create({
      data: {
        ...cloneData,
        members: {
          create: { userId: effectiveUserId, role: MembershipRole.OWNER, accepted: true },
        },
      },
      include: { members: true },
    });

    req.statusCode = 201;

    return {
      team: schemaTeamReadPublic.parse(team),
      owner: schemaMembershipPublic.parse(team.members[0]),
      message: `Team created successfully. We also made user with ID=${effectiveUserId} the owner of this team.`,
    };
  }

  const pendingPaymentTeam = await prisma.team.create({
    data: {
      ...cloneData,
      pendingPayment: true,
    },
  });

  const checkoutSession = await generateTeamCheckoutSession({
    pendingPaymentTeamId: pendingPaymentTeam.id,
    ownerId: effectiveUserId,
  });

  return {
    message:
      "Your team will be created once we receive your payment. Please complete the payment using the payment link.",
    paymentLink: checkoutSession.url,
    pendingTeam: {
      ...schemaTeamReadPublic.parse(pendingPaymentTeam),
    },
  };
}

async function checkPermissions(req: NextApiRequest) {
  const { isSystemWideAdmin } = req;
  const body = schemaTeamCreateBodyParams.parse(req.body);

  /* Non-admin users can only create teams for themselves */
  if (!isSystemWideAdmin && body.ownerId)
    throw new HttpError({
      statusCode: 401,
      message: "ADMIN required for `ownerId`",
    });
}

const generateTeamCheckoutSession = async ({
  pendingPaymentTeamId,
  ownerId,
}: {
  pendingPaymentTeamId: number;
  ownerId: number;
}) => {
  const [customer, dubCustomer] = await Promise.all([
    getStripeCustomerIdFromUserId(ownerId),
    getDubCustomer(ownerId.toString()),
  ]);

  const session = await stripe.checkout.sessions.create({
    customer,
    mode: "subscription",
    ...(dubCustomer?.discount?.couponId
      ? {
          discounts: [
            {
              coupon:
                process.env.NODE_ENV !== "production" && dubCustomer.discount.couponTestId
                  ? dubCustomer.discount.couponTestId
                  : dubCustomer.discount.couponId,
            },
          ],
        }
      : { allow_promotion_codes: true }),
    success_url: `${WEBAPP_URL}/api/teams/api/create?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEBAPP_URL}/settings/my-account/profile`,
    line_items: [
      {
        /** We only need to set the base price and we can upsell it directly on Stripe's checkout  */
        price: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
        /**Initially it will be just the team owner */
        quantity: 1,
      },
    ],
    customer_update: {
      address: "auto",
    },
    // Disabled when testing locally as usually developer doesn't setup Tax in Stripe Test mode
    automatic_tax: {
      enabled: IS_PRODUCTION,
    },
    metadata: {
      pendingPaymentTeamId,
      ownerId,
      dubCustomerId: ownerId, // pass the userId during checkout creation for sales conversion tracking: https://d.to/conversions/stripe
    },
  });

  if (!session.url)
    throw new HttpError({
      statusCode: 500,
      message: "Failed generating a checkout session URL.",
    });

  return session;
};

export default defaultResponder(postHandler);
