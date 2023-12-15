import EventTypes from "@pages/event-types";
import { _generateMetadata } from "_app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("event_types_page_title"),
    (t) => t("event_types_page_subtitle")
  );

export default EventTypes;
