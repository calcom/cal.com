import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import type { CalendsoSessionUser } from "next-auth";

import type prisma from "@calcom/prisma";

export type AppUser = CalendsoSessionUser | undefined;
export type AppPrisma = typeof prisma;
export type AppGetServerSidePropsContext = GetServerSidePropsContext<{
  pages: string[];
}>;

export type AppGetServerSideProps = (
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser
) => GetServerSidePropsResult;
