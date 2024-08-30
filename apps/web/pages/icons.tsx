"use client";

import type { InferGetStaticPropsType } from "next";
import Head from "next/head";

import { APP_NAME } from "@calcom/lib/constants";
import type { IconName } from "@calcom/ui";
import { Icon, IconSprites } from "@calcom/ui";

import { lucideIconList } from "../../../packages/ui/components/icon/icon-list.mjs";

export const getStaticProps = async () => {
  return {
    props: {
      icons: Array.from(lucideIconList) as IconName[],
    },
  };
};

export default function IconsPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <div className="bg-subtle flex h-screen font-sans">
      <Head>
        <title>Icon showcase | {APP_NAME}</title>
      </Head>
      <IconSprites />
      <div className="bg-default m-auto min-w-full rounded-md p-10 text-right ltr:text-left">
        <h1 className="text-emphasis text-2xl font-medium">Icons showcase</h1>
        <div className="grid grid-cols-2 lg:grid-cols-6">
          {props.icons.map((icon) => {
            return (
              <div key={icon} className="flex items-center gap-1">
                <Icon name={icon} />
                <div>{icon}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
