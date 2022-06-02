import HelpscoutMenuItem from "@ee/lib/helpscout/HelpscoutMenuItem";
import IntercomMenuItem from "@ee/lib/intercom/IntercomMenuItem";
import ZendeskMenuItem from "@ee/lib/zendesk/ZendeskMenuItem";

export default function HelpMenuItem() {
  return (
    <>
      <IntercomMenuItem />
      <ZendeskMenuItem />
      <HelpscoutMenuItem />
    </>
  );
}
