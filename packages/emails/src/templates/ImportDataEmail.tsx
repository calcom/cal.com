import { SUPPORT_MAIL_ADDRESS, WEBAPP_URL } from "@calcom/lib/constants";

import { BaseEmailHtml, CallToAction } from "../components";

export type ImportDataEmailProps = {
  user: {
    name?: string | null;
    email: string;
  };
  status: boolean;
  provider: string;
};

export const ImportDataEmail = (
  props: ImportDataEmailProps & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  return (
    <BaseEmailHtml subject="Welcome to Our Platform">
      <p>
        <>Hello {props.user.name || "there"}!</>
      </p>
      {props.status ? (
        <>
          {" "}
          <p style={{ fontWeight: 400, lineHeight: "24px" }}>
            {" "}
            <>Your data from {props.provider} has been successfully imported.</>
          </p>
          <CallToAction label="Start Scheduling Events" href={WEBAPP_URL} />
        </>
      ) : (
        <>
          {" "}
          <p style={{ fontWeight: 400, lineHeight: "24px" }}>
            {" "}
            <>There was an issue while importing your data from {props.provider}</>
          </p>
          <CallToAction label="Try again" href={`${WEBAPP_URL}/settings/import/calendly`} />
        </>
      )}

      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>
            If you have any questions, feel free to{" "}
            <a
              href={`mailto:${SUPPORT_MAIL_ADDRESS}`}
              style={{ color: "#3E3E3E" }}
              target="_blank"
              rel="noreferrer">
              contact our support team
            </a>
            , <br />
            Happy Scheduling 📆.
          </>
        </p>
      </div>
    </BaseEmailHtml>
  );
};
