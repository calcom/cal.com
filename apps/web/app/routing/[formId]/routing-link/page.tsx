import React from 'react';
import { useRouter } from 'next/router';
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsResult } from "next";
import { cookies, headers } from "next/headers";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@lib/apps/routing-forms/forms/getServerSideProps";
import LegacyPage, { getLayout } from "~/apps/[slug]/[...pages]/pages-view";

export const generateMetadata = async ({ searchParams }: { searchParams: Record<string, string> }) => {
  const legacyContext = buildLegacyCtx(headers(), cookies(), {}, searchParams);
  const data = await getData(legacyContext);

  return await _generateMetadata(
    (t) => t("routing_forms"),
    (t) => t("routing_forms_description")
  );
};

const getData = withAppDirSsr<GetServerSidePropsResult<any>>(getServerSideProps);

const RoutingLinkPage = () => {
    const router = useRouter();
    const { formId } = router.query;

    return (
        <div>
            <h1>Routing Link for Form: {formId}</h1>
            {/* Add your routing link content here */}
        </div>
    );
};

export default WithLayout({
  getLayout,
  getData,
  Page: LegacyPage,
});
