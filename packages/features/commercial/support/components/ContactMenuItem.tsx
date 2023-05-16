import FreshChatMenuItem from "../lib/freshchat/FreshChatMenuItem";
import HelpscoutMenuItem from "../lib/helpscout/HelpscoutMenuItem";
import IntercomMenuItem from "../lib/intercom/IntercomMenuItem";
import ZendeskMenuItem from "../lib/zendesk/ZendeskMenuItem";

interface ContactMenuItem {
  onHelpItemSelect: () => void;
}

export default function ContactMenuItem(props: ContactMenuItem) {
  const { onHelpItemSelect } = props;
  return (
    <>
      <IntercomMenuItem onHelpItemSelect={onHelpItemSelect} />
      <ZendeskMenuItem onHelpItemSelect={onHelpItemSelect} />
      <HelpscoutMenuItem onHelpItemSelect={onHelpItemSelect} />
      <FreshChatMenuItem onHelpItemSelect={onHelpItemSelect} />
    </>
  );
}
