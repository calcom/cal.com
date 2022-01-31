import App from "@components/App";

export default function Zoom() {
  return (
    <App
      name="Zoom"
      logo="/apps/zoom.svg"
      categories={["video", "communication"]}
      author="Cal.com"
      price={10}
      monthly={true}
      description={
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
