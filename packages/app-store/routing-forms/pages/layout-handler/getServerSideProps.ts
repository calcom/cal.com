import type { GetServerSidePropsContext } from "next";

import type { GetServerSidePropsRestArgs } from "./types";
import { getComponent } from "./utils";

export async function getServerSideProps(
  context: GetServerSidePropsContext,
  ...rest: GetServerSidePropsRestArgs
) {
  const component = getComponent(context.params?.pages?.[0] || "");
  return component.getServerSideProps?.(context, ...rest) || { props: {} };
}
