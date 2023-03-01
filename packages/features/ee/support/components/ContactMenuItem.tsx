import FreshChatMenuItem from "../lib/freshchat/FreshChatMenuItem";
import HelpscoutMenuItem from "../lib/helpscout/HelpscoutMenuItem";
import IntercomMenuItem from "../lib/intercom/IntercomMenuItem";
import ZendeskMenuItem from "../lib/zendesk/ZendeskMenuItem";

export default function ContactMenuItem() {
  return (
    <>
      <IntercomMenuItem />
      <ZendeskMenuItem />
      <HelpscoutMenuItem />
      <FreshChatMenuItem />
    </>
  );
}
