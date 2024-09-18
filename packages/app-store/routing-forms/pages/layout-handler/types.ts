import type { GetServerSidePropsContext } from "next";
import type React from "react";

import type { AppPrisma, AppSsrInit, AppUser } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";

export type GetServerSidePropsRestArgs = [AppPrisma, AppUser, AppSsrInit];
export type Component = {
  default: React.ComponentType & Pick<AppProps["Component"], "getLayout">;
  getServerSideProps?: (context: GetServerSidePropsContext, ...rest: GetServerSidePropsRestArgs) => void;
};
