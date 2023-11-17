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
          onClick={() => router.push("/teams")}
          className="hover:bg-subtle hover:text-emphasis text-default flex w-full px-5 py-2 pr-4 text-sm font-medium">
          {t("contact_support")}
          {t("upgrade")}
        </button>
      )}
    </>
  );
}
