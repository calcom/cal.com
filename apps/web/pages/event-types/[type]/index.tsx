import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import EventTypePageWrapper from "~/event-types/views/event-types-single-view";

export type {
  FormValues,
  CustomInputParsed,
  EventTypeSetup,
  EventTypeSetupProps,
  Host,
} from "@calcom/features/eventtypes/lib/types";

const Page = (props: PageProps) => <EventTypePageWrapper {...props} />;
Page.PageWrapper = PageWrapper;

export { getServerSideProps } from "@lib/event-types/[type]/getServerSideProps";
export default Page;
