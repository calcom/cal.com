"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { trpc } from "@calcom/trpc/react";

import {
  CALENDAR_CONNECT_CALLBACK_URL,
  useCalendarConnectWindowListener,
} from "~/auth/calendar-connect-window";

import { useEmbedQueryString } from "../../hooks/use-embed-query-string";
import { PersonalCalendarView } from "./personal-calendar-view";

export const EmbedPersonalCalendarView = ({ userEmail }: { userEmail: string }) => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { queryString } = useEmbedQueryString();

  const onCalendarConnected = useCallback(() => {
    utils.viewer.apps.integrations.invalidate();
  }, [utils]);

  useCalendarConnectWindowListener(true, onCalendarConnected);

  return (
    <PersonalCalendarView
      userEmail={userEmail}
      backUrl={`/onboarding/personal/settings?${queryString}`}
      calendarReturnTo={CALENDAR_CONNECT_CALLBACK_URL}
      onCompleted={() => {
        router.push(`/auth/oauth2/authorize?${queryString}`);
      }}
    />
  );
};
