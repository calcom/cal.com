import { getErrorFromUnknown } from "@calcom/lib/errors";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import qs from "qs";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

const log = logger.getSubLogger({ prefix: ["lawpay", "callback"] });

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { reference, status, code, error: queryError } = req.query;
    const state = decodeOAuthState(req);

    // OAuth-style return (e.g. from setup): redirect to setup page (validate to prevent open redirect)
    if (queryError) {
      log.error("OAuth callback error", { error: queryError });
      const redirectUrl = getSafeRedirectUrl(state?.onErrorReturnTo) ?? "/apps/lawpay/setup";
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(queryError as string)}`);
    }
    if (code) {
      log.info("OAuth callback received, redirecting to setup");
      const redirectUrl = getSafeRedirectUrl(state?.returnTo) ?? "/apps/lawpay/setup";
      return res.redirect(`${redirectUrl}?success=true`);
    }

    // Payment return: reference = payment externalId (or uid), status = succeeded | failed | cancelled etc.
    if (!reference || typeof reference !== "string") {
      return res.redirect("/apps/lawpay/setup");
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ externalId: reference }, { uid: reference }],
        appId: "lawpay",
      },
      select: {
        id: true,
        uid: true,
        bookingId: true,
        data: true,
        booking: {
          select: {
            uid: true,
            userId: true,
            user: { select: { username: true } },
            eventType: { select: { slug: true, teamId: true } },
          },
        },
      },
    });

    if (!payment || !payment.booking) {
      throw new HttpCode({ statusCode: 404, message: "Payment not found" });
    }

    const paymentStatus = (status as string)?.toLowerCase();
    const success =
      paymentStatus === "succeeded" || paymentStatus === "completed" || paymentStatus === "success";

    if (!success) {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: "CANCELLED" },
      });
      const username = payment.booking.user?.username;
      const slug = payment.booking.eventType?.slug;
      const url = username && slug ? `/${username}/${slug}` : "/";
      return res.redirect(url);
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { success: true },
    });

    const queryParams = {
      "flag.coep": false,
      isSuccessBookingPage: true,
      eventTypeSlug: payment.booking.eventType?.slug,
    };
    const data = payment.data as Record<string, unknown> | null;
    if (data?.email && typeof data.email === "string") {
      (queryParams as Record<string, unknown>).email = data.email;
    }
    const query = qs.stringify(queryParams);
    const url = `/booking/${payment.booking.uid}?${query}`;

    return res.redirect(url);
  } catch (err) {
    log.error("Error in LawPay callback", getErrorFromUnknown(err));
    if (err instanceof HttpCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
