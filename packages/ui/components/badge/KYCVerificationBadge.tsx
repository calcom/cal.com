import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const KYCVerificationBadge = function KYCVerificationBadge(props: {
  verifyTeam?: Dispatch<SetStateAction<boolean>>;
}) {
  const { verifyTeam } = props;
  const { t } = useLocale();
  if (verifyTeam) {
    return (
      <>
        <Tooltip content={t("Verify your team to enable sending messages to attendees")}>
          <Badge variant="gray" onClick={() => verifyTeam(true)}>
            {t("verify_account")}
          </Badge>
        </Tooltip>
      </>
    );
  }
  return <></>;
};
