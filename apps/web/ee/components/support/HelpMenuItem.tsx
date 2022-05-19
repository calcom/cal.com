import HelpscoutMenuItem from "../../lib/helpscout/HelpscoutMenuItem";
import IntercomMenuItem from "../../lib/intercom/IntercomMenuItem";
import ZendeskMenuItem from "../../lib/zendesk/ZendeskMenuItem";
import LicenseRequired from "../LicenseRequired";

export default function HelpMenuItem() {
  return (
    <LicenseRequired>
      <IntercomMenuItem />
      <ZendeskMenuItem />
      <HelpscoutMenuItem />
    </LicenseRequired>
  );
}
