import { useHasTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";

import FreshChatMenuItem from "../lib/freshchat/FreshChatMenuItem";
import HelpscoutMenuItem from "../lib/helpscout/HelpscoutMenuItem";
import IntercomMenuItem from "../lib/intercom/IntercomMenuItem";
import ZendeskMenuItem from "../lib/zendesk/ZendeskMenuItem";

interface ContactMenuItem {
  onHelpItemSelect: () => void;
}

export default function ContactMenuItem(props: ContactMenuItem) {
  const { onHelpItemSelect } = props;
  const { hasTeamPlan } = useHasTeamPlan();
  return (
    <>
      {hasTeamPlan ? (
        <>
          <IntercomMenuItem onHelpItemSelect={onHelpItemSelect} />
          <ZendeskMenuItem onHelpItemSelect={onHelpItemSelect} />
          <HelpscoutMenuItem onHelpItemSelect={onHelpItemSelect} />
          <FreshChatMenuItem onHelpItemSelect={onHelpItemSelect} />
        </>
      ) : (
        <button
          tooltip={t("Upgrade to a teams plan to access support")}
          className="ml-4 lg:ml-0"
          onClick={() => router.push("/teams")}>
          {t("upgrade")}
        </button>
      )}
    </>
  );
}
