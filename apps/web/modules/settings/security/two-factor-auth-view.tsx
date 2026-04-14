"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import { InfoIcon } from "@coss/ui/icons";
import { Skeleton } from "@coss/ui/components/skeleton";
import DisableTwoFactorModal from "@components/settings/DisableTwoFactorModal";
import EnableTwoFactorModal from "@components/settings/EnableTwoFactorModal";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const TwoFactorAuthView = () => {
  const utils = trpc.useUtils();
  const { data: sessionData } = useSession();

  const { t } = useLocale();
  const { data: user, isPending } = trpc.viewer.me.get.useQuery({ includePasswordAdded: true });

  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);

  const isCalProvider = user?.identityProvider === "CAL";
  const canSetupTwoFactor = !isCalProvider && !user?.twoFactorEnabled && !user?.passwordAdded;

  return (
    <div className="flex flex-col gap-4">
      {!isPending && canSetupTwoFactor && (
        <Alert variant="info">
          <InfoIcon />
          <AlertDescription>{t("2fa_disabled")}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardPanel>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardFrameHeader className="p-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardFrameTitle>{t("two_factor_auth")}</CardFrameTitle>
                {!isPending ? (
                  <Badge className="text-xs" variant={user?.twoFactorEnabled ? "success" : "warning"}>
                    {user?.twoFactorEnabled ? t("enabled") : t("disabled")}
                  </Badge>
                ) : null}
              </div>
              <CardFrameDescription>{t("add_an_extra_layer_of_security")}</CardFrameDescription>
            </CardFrameHeader>
            {isPending ? (
              <Skeleton className="h-9 sm:h-8 w-20 rounded-lg" />
            ) : user?.twoFactorEnabled ? (
              <Button
                data-testid="two-factor-switch"
                onClick={() => setDisableModalOpen(true)}
                variant="outline">
                {t("disable")}
              </Button>
            ) : (
              <Button data-testid="two-factor-switch" onClick={() => setEnableModalOpen(true)}>
                {t("enable")}
              </Button>
            )}
          </div>
        </CardPanel>
      </Card>

      <EnableTwoFactorModal
        open={enableModalOpen}
        onClose={() => setEnableModalOpen(false)}
        onEnable={() => {
          setEnableModalOpen(false);
          if (sessionData?.user.role === "INACTIVE_ADMIN") {
            signOut({ callbackUrl: "/auth/login" });
          } else {
            utils.viewer.me.invalidate();
          }
        }}
      />

      <DisableTwoFactorModal
        open={disableModalOpen}
        disablePassword={!isCalProvider}
        onClose={() => setDisableModalOpen(false)}
        onDisable={() => {
          setDisableModalOpen(false);
          utils.viewer.me.invalidate();
        }}
      />
    </div>
  );
};

export default TwoFactorAuthView;
