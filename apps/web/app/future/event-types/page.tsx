import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import EventTypes from "~/event-types/views/event-types-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle")
  );

export default WithLayout({ getLayout, Page: EventTypes })<"P">;
