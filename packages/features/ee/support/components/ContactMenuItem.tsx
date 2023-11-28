import { JOIN_DISCORD } from "@calcom/lib/constants";
import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UpgradeTeamsBadge } from "@calcom/ui";
import { ExternalLink } from "@calcom/ui/components/icon";

import FreshChatMenuItem from "../lib/freshchat/FreshChatMenuItem";
import HelpscoutMenuItem from "../lib/helpscout/HelpscoutMenuItem";
import IntercomMenuItem from "../lib/intercom/IntercomMenuItem";
import ZendeskMenuItem from "../lib/zendesk/ZendeskMenuItem";

interface ContactMenuItem {
  onHelpItemSelect: () => void;
}

export default function ContactMenuItem(props: ContactMenuItem) {
  const { t } = useLocale();
  const { onHelpItemSelect } = props;
  const { hasPaidPlan } = useHasPaidPlan();
  return (
    <>
      {hasPaidPlan ? (
        <>
          <IntercomMenuItem onHelpItemSelect={onHelpItemSelect} />
          <ZendeskMenuItem onHelpItemSelect={onHelpItemSelect} />
          <HelpscoutMenuItem onHelpItemSelect={onHelpItemSelect} />
          <FreshChatMenuItem onHelpItemSelect={onHelpItemSelect} />
        </>
      ) : (
        <div className=" hover:text-emphasis text-default flex w-full cursor-not-allowed justify-between px-5 py-2 pr-4 text-sm font-medium">
          {t("premium_support")}
          <UpgradeTeamsBadge />
        </div>
      )}
      <a
        href={JOIN_DISCORD}
        target="_blank"
        className="hover:bg-subtle hover:text-emphasis text-default flex w-full px-5 py-2 pr-4 text-sm font-medium">
        {t("community_support")}{" "}
        <ExternalLink className="group-hover:text-subtle text-muted ml-1 mt-px h-4 w-4 flex-shrink-0 ltr:mr-3" />
      </a>
    </>
  );
}
