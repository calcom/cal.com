import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const KYCVerificationBadge = function KYCVerificationBadge(props: { verifyTeamAction?: () => void }) {
  const { verifyTeamAction } = props;
  const { t } = useLocale();
  if (!verifyTeamAction) return <></>;

  return (
    <>
      <Tooltip content={t("verify_team_tooltip")}>
        <Badge variant="gray" onClick={() => verifyTeamAction()}>
          {t("verify_account")}
        </Badge>
      </Tooltip>
    </>
  );
};
