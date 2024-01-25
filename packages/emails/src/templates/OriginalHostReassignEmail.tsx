import type { TFunction } from "next-i18next";

import dayjs from "@calcom/dayjs";

import { BaseEmailHtml, Info } from "../components";

export interface OrignalHostProps {
  username: string;
  eventName: string;
  startTime: Date;
  endTime: Date;
  timeZone: string;
  locale: string;
  t: TFunction;
}

export const OriginalHostReassignEmail = (props: OrignalHostProps) => {
  const { t } = props;
  const startTime = dayjs(props.startTime).tz(props.timeZone).locale(props.locale);
  const endTime = dayjs(props.endTime).tz(props.timeZone).locale(props.locale);
  const eventTime = `${startTime.format("h:mma")} - ${endTime.format("h:mma")}, ${t(
    startTime.format("dddd").toLowerCase()
  )}, ${t(startTime.format("MMMM").toLowerCase())} ${startTime.format("D, YYYY")}`;

  return (
    <BaseEmailHtml subject="Round Robin Host Reassignment" title="Event reassigned to new host">
      <Info label="Event name" description={props.eventName} withSpacer />
      <Info label="Event date" description={eventTime} withSpacer />
      <Info label="New host" description={props.username} withSpacer />
    </BaseEmailHtml>
  );
};
