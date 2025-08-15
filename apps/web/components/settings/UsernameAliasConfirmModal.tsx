import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";

interface UsernameAliasConfirmModalProps {
  username: string;
  onCancel: () => void;
}

const UsernameAliasConfirmModal = ({ username, onCancel }: UsernameAliasConfirmModalProps) => {
  const { t } = useLocale();

  return (
    <Dialog open={true}>
      <DialogContent
        title={t("username_alias_added")}
        description={t("username_alias_added_description")}
        type="success"
        Icon={Icon.FiCheck}>
        <div className="flex flex-row">
          <div className="mb-4 w-full pt-1">
            <div className="bg-subtle flex w-full flex-wrap rounded-sm px-4 py-3 text-sm">
              <div>
                <p className="text-subtle">{t("username_alias")}</p>
                <p className="text-emphasis mt-1 max-w-md overflow-hidden text-ellipsis break-all">
                  {username}
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onCancel}>{t("done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameAliasConfirmModal;
