import HelpscoutMenuItem from "../lib/helpscout/HelpscoutMenuItem";
import IntercomMenuItem from "../lib/intercom/IntercomMenuItem";
import ZendeskMenuItem from "../lib/zendesk/ZendeskMenuItem";

export default function HelpMenuItem() {
  return (
    <>
      <IntercomMenuItem />
      <ZendeskMenuItem />
      <HelpscoutMenuItem />
    </>
  );
}
