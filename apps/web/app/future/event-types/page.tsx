import EventTypes from "@pages/event-types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle")
  );

export default WithLayout({ getLayout, Page: EventTypes })<"P">;
