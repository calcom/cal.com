"use client";

import { EventType } from "@calcom/atoms/monorepo";

/* eslint-disable @typescript-eslint/no-empty-function */
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import type { AppProps } from "@lib/app-providers";

import { type PageProps } from "~/event-types/views/event-types-single-view.getServerSideProps";

const EventTypePageWrapper: React.FC<PageProps> & {
  PageWrapper?: AppProps["Component"]["PageWrapper"];
  getLayout?: AppProps["Component"]["getLayout"];
} = (props) => {
  return <EventType id={props.type} />;
};

export default EventTypePageWrapper;
