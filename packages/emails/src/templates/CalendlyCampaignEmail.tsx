import { DEMO_URL, SIGNUP_URL, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";

import { BaseEmailHtml, CallToAction } from "../components";

export type CalendlyCampaignEmailProps = {
  user: {
    slug: string;
    fullName: string;
  };
  receiverEmail: string;
};

export const CalendlyCampaignEmail = (
  props: CalendlyCampaignEmailProps & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  return (
    <BaseEmailHtml subject="">
      <p style={{ fontWeight: 400, lineHeight: "24px", margin: "0 0 20px" }}>
        Drumroll, please! 🥁 I just made the leap from Calendly to CAL ID, and it’s a total game-changer.
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", margin: "0 0 20px" }}>
        Here’s why you need to jump on board:
      </p>
      <ul style={{ fontWeight: 400, lineHeight: "24px", paddingLeft: "20px", margin: "0 0 20px" }}>
        <li>
          <strong>Sleek URL</strong>: Get a clean and customizable booking link{" "}
          <a href={`https://cal.id/${props.user.slug}`} style={{ color: "#007bff", textDecoration: "none" }}>
            cal.id/{props.user.slug}
          </a>
        </li>
        <li>
          <strong>Unlimited Events</strong>: No limits on how many events you can manage
        </li>
        <li>
          <strong>Smart Workflows</strong>: Automate like a pro
        </li>
        <li>
          <strong>Zero Cost</strong>: All these features without the subscription fee
        </li>
      </ul>
      <p style={{ fontWeight: 400, lineHeight: "24px", margin: "0 0 20px" }}>
        Register below and see how OneHash Cal can revolutionize your scheduling.
      </p>
      <CallToAction label="Register Here" href={SIGNUP_URL ?? "cal.id"} />

      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>
            If you have any questions, or need{" "}
            <a href={DEMO_URL} style={{ color: "#3E3E3E", textDecoration: "underline" }}>
              demo
            </a>
            , feel free to{" "}
            <a
              href={`mailto:${SUPPORT_MAIL_ADDRESS}`}
              style={{ color: "#3E3E3E" }}
              target="_blank"
              rel="noreferrer">
              contact OneHash&apos;s support team
            </a>
            , <br />
            Happy Scheduling 📆.
          </>
        </p>
      </div>
    </BaseEmailHtml>
  );
};
