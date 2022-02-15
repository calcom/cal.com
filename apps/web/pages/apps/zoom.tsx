import App from "@components/App";

export default function Zoom() {
  return (
    <App
      name="Zoom"
      logo="/apps/zoom.svg"
      categories={["video", "communication"]}
      author="Cal.com"
      type="usage-based" // "usage-based" or "monthly" or "one-time"
      price={0} // 0 = free. if type="usage-based" it's the price per booking
      commission={0.5} // only required for "usage-based" billing. % of commission for paid bookings
      docs="https://zoom.us/download"
      website="https://zoom.us"
      email="support@zoom.us"
      tos="https://zoom.us/terms"
      privacy="https://zoom.us/privacy"
      body={
        <>
          Start Zoom Meetings and make Zoom Phone calls with flawless video, crystal clear audio, and instant
          screen sharing from any Slack channel, private group, or direct message using the /zoom slash
          command.
          <br />
          <br />
          The Zoom app for Slack can be installed individually by any Slack user with a Zoom account or be
          deployed to the whole organization centrally by the Zoom account admin with a few simple steps.
        </>
      }
    />
  );
}
