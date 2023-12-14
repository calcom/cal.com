import Workflows from "@pages/workflows";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import type { CalPageWrapper } from "@components/PageWrapper";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications")
  );

const WorkflowsPage = Workflows as CalPageWrapper;

// @ts-expect-error Type 'CalPageWrapper' is not assignable to type '(props: Record<string, any>) => ReactElement<any, string | JSXElementConstructor<any>>'
export default WithLayout({ getLayout, Page: WorkflowsPage })<"P">;
