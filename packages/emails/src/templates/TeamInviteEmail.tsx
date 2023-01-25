import type { TFunction } from "next-i18next";
import { ReactNode } from "react";

import { APP_NAME, BASE_URL, IS_PRODUCTION } from "@calcom/lib/constants";

import { V2BaseEmailHtml, CallToAction } from "../components";

type TeamInvite = {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
  isCalComUser?: boolean;
};

export const TeamInviteEmail = (
  props: TeamInvite & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  // If the user is a Cal.com user, we want to show a different email
  if (props.isCalComUser) {
    <V2BaseEmailHtml
      subject={props.language("user_invited_you", {
        user: props.from,
        team: props.teamName,
        appName: APP_NAME,
      })}>
      <img
        height="64"
        src={
          IS_PRODUCTION
            ? BASE_URL + "/emails/teamCircle@2x.png"
            : "http://localhost:3000/emails/teamCircle@2x.png"
        }
        style={{
          border: "0",
          display: "block",
          outline: "none",
          textDecoration: "none",
          height: "64px",
          fontSize: "13px",
          marginBottom: "24px",
        }}
        width="64"
        alt=""
      />
      <p style={{ fontSize: "24px", marginBottom: "16px" }}>
        <>
          {props.language("user_invited_you", {
            user: props.from,
            team: props.teamName,
            appName: APP_NAME,
          })}
          !
        </>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "32px" }}>
        <>{props.language("calcom_explained", { appName: APP_NAME })}</>
      </p>
      <CallToAction label={props.language("accept_invitation")} href={props.joinLink} />

      <div style={{ borderTop: "1px solid #E1E1E1", marginTop: "32px", paddingTop: "32px" }}>
        <p style={{ fontWeight: 400, margin: 0 }}>
          <>
            {props.language("have_any_questions")}{" "}
            <a href="mailto:support@cal.com" style={{ color: "#3E3E3E" }} target="_blank" rel="noreferrer">
              <>{props.language("contact")}</>
            </a>{" "}
            {props.language("our_support_team")}
          </>
        </p>
      </div>
    </V2BaseEmailHtml>;
  }

  return (
    <V2BaseEmailHtml
      subject={props.language("user_invited_you", {
        user: props.from,
        team: props.teamName,
        appName: APP_NAME,
      })}>
      <p style={{ fontSize: "24px", marginBottom: "16px", textAlign: "center" }}>
        <>{props.language("email_no_user_invite_heading")}</>
      </p>
      <div
        style={{
          backgroundColor: "#101010",
          borderRadius: "16px",
          height: "270px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <svg width="154" height="153" viewBox="0 0 154 153" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="77" cy="76.5" r="64" stroke="#6B7280" strokeWidth="25" />
          <mask id="path-2-inside-1_1831_113144" fill="white">
            <path d="M140.388 85.4087C147.219 86.3686 153.642 81.5882 153.479 74.6928C153.293 66.8505 151.902 59.058 149.332 51.594C145.402 40.1793 138.826 29.8568 130.141 21.4705C121.457 13.0842 110.911 6.87234 99.3664 3.34269C91.8173 1.03468 83.9811 -0.0836184 76.137 0.00486012C69.2402 0.0826541 64.6868 6.66861 65.8845 13.4611V13.4611C67.0822 20.2536 73.6122 24.6281 80.4936 25.0958C84.4056 25.3617 88.288 26.0742 92.0638 27.2285C99.8393 29.6058 106.942 33.7895 112.791 39.4376C118.64 45.0858 123.069 52.038 125.716 59.7258C127.001 63.459 127.849 67.3142 128.251 71.2145C128.958 78.0754 133.558 84.4487 140.388 85.4087V85.4087Z" />
          </mask>
          <circle cx="76.5" cy="76.5" r="64" stroke="#6B7280" strokeWidth="25" />
          <path
            d="M140.388 85.4087C147.219 86.3686 153.642 81.5882 153.479 74.6928C153.293 66.8505 151.902 59.058 149.332 51.594C145.402 40.1793 138.826 29.8568 130.141 21.4705C121.457 13.0842 110.911 6.87234 99.3664 3.34269C91.8173 1.03468 83.9811 -0.0836184 76.137 0.00486012C69.2402 0.0826541 64.6868 6.66861 65.8845 13.4611V13.4611C67.0822 20.2536 73.6122 24.6281 80.4936 25.0958C84.4056 25.3617 88.288 26.0742 92.0638 27.2285C99.8393 29.6058 106.942 33.7895 112.791 39.4376C118.64 45.0858 123.069 52.038 125.716 59.7258C127.001 63.459 127.849 67.3142 128.251 71.2145C128.958 78.0754 133.558 84.4487 140.388 85.4087V85.4087Z"
            stroke="white"
            strokeWidth="50"
            mask="url(#path-2-inside-1_1831_113144)"
          />
          <path
            d="M48.8565 90H64.8245V86.064H57.2725C58.0725 85.488 58.7125 84.72 59.2565 84.016L62.7445 79.472C64.2165 77.584 64.6965 76.112 64.6965 74.32C64.6965 70.352 61.4645 67.184 56.8245 67.184C52.2165 67.184 48.8565 70.352 48.8565 74.96H53.4965C53.4965 72.656 54.6805 71.344 56.7605 71.344C58.8405 71.344 60.0565 72.656 60.0565 74.576C60.0565 75.952 59.1605 77.36 57.8165 78.928L48.8565 89.488V90ZM73.4575 90.416C78.6095 90.416 82.1295 87.184 82.1295 82.736C82.1295 78.864 79.8255 75.28 74.4815 75.28C73.8415 75.28 73.2335 75.28 72.5935 75.504L73.2015 71.536H80.3375V67.6H69.7135L67.6335 80.464C69.3295 79.568 70.9615 79.056 72.8175 79.056C76.2415 79.056 77.4895 80.592 77.4895 82.736C77.4895 84.88 76.0815 86.256 73.1375 86.256C71.1535 86.256 69.4575 85.616 68.0495 84.784L66.4175 88.688C68.8815 90.064 70.9615 90.416 73.4575 90.416ZM84.0903 90H87.6102L103.514 67.6H100.026L84.0903 90ZM83.3863 72.304C83.3863 74.992 85.4343 77.168 88.3463 77.168C91.2583 77.168 93.3383 74.992 93.3383 72.304C93.3383 69.616 91.2903 67.344 88.3463 67.344C85.4343 67.344 83.3863 69.584 83.3863 72.304ZM86.4903 72.304C86.4903 71.184 87.2583 70.32 88.3463 70.32C89.4663 70.32 90.2023 71.184 90.2023 72.304C90.2343 73.392 89.4983 74.224 88.3463 74.224C87.2583 74.224 86.4903 73.36 86.4903 72.304ZM94.2663 85.392C94.2663 88.08 96.3143 90.256 99.2263 90.256C102.138 90.256 104.218 88.08 104.218 85.392C104.218 82.672 102.138 80.432 99.2263 80.432C96.3143 80.432 94.2663 82.672 94.2663 85.392ZM97.3703 85.392C97.3703 84.272 98.1383 83.408 99.2263 83.408C100.314 83.408 101.082 84.272 101.082 85.392C101.114 86.48 100.346 87.344 99.2263 87.312C98.1383 87.312 97.3703 86.448 97.3703 85.392Z"
            fill="white"
          />
        </svg>
      </div>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "32px" }}>
        <>{props.language("calcom_explained_new_user", { appName: APP_NAME })}</>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <EmailStep
          translationString={props.language("email_no_user_step_one")}
          icon={
            <>
              <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17 1L6 12L1 7"
                  stroke="#111827"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </>
          }
          iconBgColor="#F3F4F6"
          iconColor="black"
          textColor="black"
        />
        <EmailStep
          translationString={props.language("email_no_user_step_two")}
          icon={
            <>
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 1V5M6 1V5M1 9H19M3 3H17C18.1046 3 19 3.89543 19 5V19C19 20.1046 18.1046 21 17 21H3C1.89543 21 1 20.1046 1 19V5C1 3.89543 1.89543 3 3 3Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          }
        />
        <EmailStep
          translationString={props.language("email_no_user_step_three")}
          icon={
            <>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M11 5V11L15 13M21 11C21 16.5228 16.5228 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1C16.5228 1 21 5.47715 21 11Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          }
        />
        <EmailStep
          translationString={props.language("email_no_user_step_four")}
          icon={
            <>
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17 19V17C17 15.9391 16.5786 14.9217 15.8284 14.1716C15.0783 13.4214 14.0609 13 13 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M13 5C13 7.20914 11.2091 9 9 9C6.79086 9 5 7.20914 5 5C5 2.79086 6.79086 1 9 1C11.2091 1 13 2.79086 13 5Z"
                  stroke="white"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </>
          }
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "48px" }}>
        <CallToAction label={props.language("create_account")} href={props.joinLink} />
      </div>

      <div style={{ borderTop: "1px solid #E1E1E1", marginTop: "32px", paddingTop: "32px" }}>
        <p style={{ fontWeight: 400, margin: 0 }}>
          <>
            {props.language("have_any_questions")}{" "}
            <a href="mailto:support@cal.com" style={{ color: "#3E3E3E" }} target="_blank" rel="noreferrer">
              <>{props.language("contact")}</>
            </a>{" "}
            {props.language("our_support_team")}
          </>
        </p>
      </div>
    </V2BaseEmailHtml>
  );
};

const EmailStep = (props: {
  translationString: string;
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  strikeThrough?: boolean;
  textColor?: string;
}) => {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          backgroundColor: props.iconBgColor || "#101010",
          borderRadius: "48px",
          height: "48px",
          width: "48px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: props.iconColor || "white",
          marginRight: "16px",
        }}>
        {props.icon}
      </div>
      <p
        style={{
          fontStyle: "normal",
          fontWeight: 500,
          fontSize: "18px",
          lineHeight: "20px",
          color: props.textColor || "#6B7280",
          textDecorationLine: props.strikeThrough ? "line-through" : "none",
        }}>
        <>{props.translationString}</>
      </p>
    </div>
  );
};
