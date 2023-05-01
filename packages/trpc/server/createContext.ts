import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getLocaleFromHeaders } from "@calcom/lib/i18n";
import prisma from "@calcom/prisma";
import type { SelectedCalendar, User as PrismaUser, Credential } from "@calcom/prisma/client";

import type { CreateNextContextOptions } from "@trpc/server/adapters/next";

type CreateContextOptions = CreateNextContextOptions | GetServerSidePropsContext;

export type CreateInnerContextOptions = {
  session: Session | null;
  locale: string;
  user?: Omit<
    PrismaUser,
    | "locale"
    | "twoFactorSecret"
    | "emailVerified"
    | "password"
    | "identityProviderId"
    | "invitedTo"
    | "allowDynamicBooking"
    | "verified"
  > & {
    locale: NonNullable<PrismaUser["locale"]>;
    credentials?: Credential[];
    selectedCalendars?: Partial<SelectedCalendar>[];
  };
  i18n: Awaited<ReturnType<typeof serverSideTranslations>>;
} & Partial<CreateContextOptions>;

export type GetSessionFn =
  | ((_options: {
      req: GetServerSidePropsContext["req"] | NextApiRequest;
      res: GetServerSidePropsContext["res"] | NextApiResponse;
    }) => Promise<Session | null>)
  | (() => Promise<Session | null>);

const DEFAULT_SESSION_GETTER: GetSessionFn = ({ req, res }) => getServerSession({ req, res });

/**
 * Inner context. Will always be available in your procedures, in contrast to the outer context.
 *
 * Also useful for:
 * - testing, so you don't have to mock Next.js' `req`/`res`
 * - tRPC's `createSSGHelpers` where we don't have `req`/`res`
 *
 * @see https://trpc.io/docs/context#inner-and-outer-context
 */
export async function createContextInner(opts: CreateInnerContextOptions) {
  return {
    prisma,
    ...opts,
  };
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async (
  { req, res }: CreateContextOptions,
  sessionGetter: GetSessionFn = DEFAULT_SESSION_GETTER
) => {
  // for API-response caching see https://trpc.io/docs/caching
  const session = await sessionGetter({ req, res });

  const locale = getLocaleFromHeaders(req);
  const i18n = await serverSideTranslations(getLocaleFromHeaders(req), ["common", "vital"]);
  const contextInner = await createContextInner({ session, i18n, locale });
  return {
    ...contextInner,
    req,
    res,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createContext>>;
