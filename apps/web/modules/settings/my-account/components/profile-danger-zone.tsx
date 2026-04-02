import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardPanel,
} from "@coss/ui/components/card";
import { Label } from "@coss/ui/components/label";
import { TrashIcon } from "@coss/ui/icons";

export type ProfileDangerZoneProps = {
  onDeleteAccount: () => void;
};

export function ProfileDangerZone({ onDeleteAccount }: ProfileDangerZoneProps) {
  const { t } = useLocale();

  return (
    <CardFrame>
      <Card>
        <CardPanel>
          <div className="flex flex-col gap-1">
            <Label className="text-base font-semibold">
              {t("danger_zone")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("account_deletion_cannot_be_undone")}
            </p>
          </div>
        </CardPanel>
      </Card>
      <CardFrameFooter className="flex justify-end">
        <Button
          variant="destructive-outline"
          data-testid="delete-account"
          onClick={onDeleteAccount}
        >
          {t("delete_account")}
        </Button>
      </CardFrameFooter>
    </CardFrame>
  );
}
