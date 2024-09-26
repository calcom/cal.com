"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { getServerSideProps } from "@server/lib/setup/getServerSideProps";

import type { PageProps } from "~/auth/setup-view";
import Setup from "~/auth/setup-view";

const Page = (props: PageProps) => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("setup")} description={t("setup_description")} />
      <Setup {...props} />
    </>
  );
};
export default Page;

export { getServerSideProps };
