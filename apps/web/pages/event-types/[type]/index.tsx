import PageWrapper from "@components/PageWrapper";

import EventTypePageWrapper from "~/event-types/views/event-types-single-view";
import { getServerSideProps } from "~/event-types/views/event-types-single-view.getServerSideProps";

export type {
  CustomInputParsed,
  EventTypeSetup,
  EventTypeSetupProps,
  FormValues,
} from "~/event-types/views/event-types-single-view";

EventTypePageWrapper.PageWrapper = PageWrapper;

export { getServerSideProps };
export default EventTypePageWrapper;
