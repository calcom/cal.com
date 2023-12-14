import LegacyPage from "@pages/workflows/[workflow]";
import type { Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";
import { z } from "zod";

import { APP_NAME } from "@calcom/lib/constants";

const querySchema = z.object({
  workflow: z.string(),
});

export const generateMetadata = async ({ params }: { params: Params }) => {
  // const req = {
  //   headers: headers(),
  //   cookies: cookies(),
  // };

  // const ctx = await createContext({ req });
  // const workflow = await getServerCaller(ctx).viewer.workflows.get({ id: Number(params.workflow) });

  return await _generateMetadata(
    () => `untitled | ${APP_NAME}`,
    () => ""
  );
};

async function getProps({ params }: { params: Params }) {
  const safeParams = querySchema.safeParse(params);

  console.log("Built workflow page:", safeParams);
  if (!safeParams.success) {
    return notFound();
  }
  return { workflow: safeParams.data.workflow };
}

export const generateStaticParams = () => [];

// @ts-expect-error export default WithLayout({ getLayout: null, getData: getProps, Page: LegacyPage })
export default WithLayout({ getLayout: null, getData: getProps, Page: LegacyPage })<"P">;
export const dynamic = "force-static";
// generate segments on demand
export const dynamicParams = "true";
export const revalidate = 10;
