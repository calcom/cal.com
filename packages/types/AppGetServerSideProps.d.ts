import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import type { CalendsoSessionUser } from "next-auth";

import type prisma from "@calcom/prisma";

import type { ssrInit } from "@server/lib/ssr";

export type AppUser = CalendsoSessionUser | undefined;
export type AppPrisma = typeof prisma;
export type AppGetServerSidePropsContext = GetServerSidePropsContext<{
  pages: string[];
}>;
export type AppSsrInit = ssrInit;
export type AppGetServerSideProps = (
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser,
  ssrInit: AppSsrInit
) => GetServerSidePropsResult;
