import PageWrapper from "@components/PageWrapper";

import EventTypePageWrapper from "~/event-types/views/event-types-single-view";
import { getServerSideProps } from "~/event-types/views/event-types-single-view.getServerSideProps";

export type {
  CustomInputParsed,
  EventTypeSetup,
  EventTypeSetupProps,
  Host,
} from "~/event-types/views/event-types-single-view";
export type { FormValues } from "@calcom/features/eventtypes/lib/types";

EventTypePageWrapper.PageWrapper = PageWrapper;

export { getServerSideProps };
export default EventTypePageWrapper;
