import { getLayout } from "@calcom/features/MainLayout";

import PageWrapper from "@components/PageWrapper";

import EventTypesPage from "~/event-types/views/event-types-listing-view";

export { getServerSideProps } from "@lib/event-types/getServerSideProps";

EventTypesPage.getLayout = getLayout;
EventTypesPage.PageWrapper = PageWrapper;

export default EventTypesPage;
