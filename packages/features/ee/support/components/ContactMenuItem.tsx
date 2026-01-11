import { useHasPaidPlan } from "@calcom/features/billing/hooks/useHasPaidPlan";
import { JOIN_COMMUNITY } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UpgradeTeamsBadge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";

import FreshChatMenuItem from "../lib/freshchat/FreshChatMenuItem";
import HelpscoutMenuItem from "../lib/helpscout/HelpscoutMenuItem";
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
        href={JOIN_COMMUNITY}
        target="_blank"
        className="hover:bg-subtle hover:text-emphasis text-default flex w-full px-5 py-2 pr-4 text-sm font-medium transition">
        {t("community_support")}{" "}
        <Icon
          name="external-link"
          className="group-hover:text-subtle text-muted ml-1 mt-px h-4 w-4 shrink-0 ltr:mr-3"
        />
      </a>
    </>
  );
}
