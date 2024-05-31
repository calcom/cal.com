import PageWrapper from "@components/PageWrapper";

import EventTypesPage from "~/event-types/views/event-types-listing-view";

export { getServerSideProps } from "@lib/event-types/getServerSideProps";

EventTypesPage.PageWrapper = PageWrapper;

export default EventTypesPage;
