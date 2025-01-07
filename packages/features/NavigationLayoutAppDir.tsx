import React, { ReactNode } from "react";

import { NavigationWrapper } from "@calcom/features/shell/navigation/NavigationWrapper";

export default async function NavigationLayoutAppDir({ children }: { children: ReactNode }) {
  return <NavigationWrapper />;
}

export const getLayout = async (page: React.ReactElement) => await NavigationLayoutAppDir({ children: page });
