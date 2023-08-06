import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { BaseEmailHtml, CallToAction } from "../components";

export type MonthlyDigestEmailData = {
  language: TFunction;
  Created: number;
  Completed: number;
  Rescheduled: number;
  Cancelled: number;
  mostBookedEvents: {
    eventTypeId?: number | null;
    eventTypeName?: string | null;
    count?: number | null;
  }[];
  membersWithMostBookings: {
    userId: number | null;
    user: {
      id: number;
      name: string | null;
      email: string;
      avatar: string | null;
      username: string | null;
    };
    count: number;
  }[];
  admin: { email: string; name: string };
  team: { name: string; id: number };
};

export const MonthlyDigestEmail = (
  props: MonthlyDigestEmailData & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const EventsDetails = () => {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "50px",
          marginTop: "30px",
          marginBottom: "30px",
        }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}>
          <div
            style={{
              height: "60px",
              width: "60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "50%",
              border: "4px solid black",
              gap: "0px",
            }}>
            <p>{props.Created}</p>
          </div>
          <p style={{ fontSize: "10px" }}>{props.language("events_created")}</p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}>
          <div
            style={{
              height: "60px",
              width: "60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "50%",
              border: "4px solid black",
              gap: "0px",
            }}>
            <p>{props.Completed}</p>
          </div>
          <p style={{ fontSize: "10px" }}>{props.language("events_completed")}</p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}>
          <div
            style={{
              height: "60px",
              width: "60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "50%",
              border: "4px solid black",
              gap: "0px",
            }}>
            <p>{props.Rescheduled}</p>
          </div>
          <p style={{ fontSize: "10px" }}>{props.language("events_rescheduled")}</p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}>
          <div
            style={{
              height: "60px",
              width: "60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "50%",
              border: "4px solid black",
              gap: "0px",
            }}>
            <p>{props.Cancelled}</p>
          </div>
          <p style={{ fontSize: "10px" }}>{props.language("events_cancelled")}</p>
        </div>
      </div>
    );
  };

  return (
    <BaseEmailHtml subject={props.language("verify_email_subject", { appName: APP_NAME })}>
      <div>
        <p
          style={{
            fontWeight: 600,
            fontSize: "32px",
            lineHeight: "38px",
            width: "100%",
            textAlign: "center",
          }}>
          {props.language("30_day_digest_email")}
        </p>
        <p style={{ fontWeight: 400, width: "100%", textAlign: "center" }}>
          <>{props.language("hi_user_name", { name: props.admin.name })}!</>
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px", width: "100%", textAlign: "center" }}>
          {props.language("summary_of_events_for_your_team_for_the_last_30_days", {
            teamName: props.team.name,
          })}
        </p>
        <EventsDetails />
        <div style={{ width: "100%" }}>
          <p style={{ marginBottom: "10px" }}>{props.language("here_are_your_most_popular_events")} :</p>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "grey" }}>
              <p>{props.language("event_name")}</p>
              <p>{props.language("times_booked")}</p>
            </div>
            {props.mostBookedEvents
              ? props.mostBookedEvents.map((ev, idx) => (
                  <div
                    key={ev.eventTypeId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "bold",
                      borderBottom: `${idx === props.mostBookedEvents.length - 1 ? "" : "1px solid grey"}`,
                    }}>
                    <p>{ev.eventTypeName}</p>
                    <p>{ev.count}</p>
                  </div>
                ))
              : null}
          </div>
        </div>
        <div style={{ width: "100%", marginTop: "30px" }}>
          <p style={{ marginBottom: "10px" }}>{props.language("here_are_your_most_booked_members")} :</p>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "grey" }}>
              <p>{props.language("member_name")}</p>
              <p>{props.language("times_booked")}</p>
            </div>
            {props.membersWithMostBookings
              ? props.membersWithMostBookings.map((it, idx) => (
                  <div
                    key={it.userId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "bold",
                      borderBottom: `${
                        idx === props.membersWithMostBookings.length - 1 ? "" : "1px solid grey"
                      }`,
                    }}>
                    <p>{it.user.name}</p>
                    <p>{it.count}</p>
                  </div>
                ))
              : null}
          </div>
        </div>
        <div style={{ width: "100%", textAlign: "center", marginTop: "30px" }}>
          <CallToAction
            label="View all stats"
            href={`${process.env.NEXT_PUBLIC_WEBSITE_URL}/insights?teamId=${props.team.id}`}
          />
        </div>
      </div>
    </BaseEmailHtml>
  );
};
