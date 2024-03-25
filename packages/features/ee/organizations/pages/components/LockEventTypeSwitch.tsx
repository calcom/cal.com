import { useState } from "react";
import { useForm } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import {
  showToast,
  Form,
  SettingsToggle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogClose,
  Button,
  RadioGroup as RadioArea,
} from "@calcom/ui";

enum CurrentEventTypeOptions {
  DELETE = "DELETE",
  HIDE = "HIDE",
}

interface GeneralViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
  isAdminOrOwner: boolean;
}

interface FormValues {
  currentEventTypeOptions: CurrentEventTypeOptions;
}

export const LockEventTypeSwitch = ({ currentOrg, isAdminOrOwner }: GeneralViewProps) => {
  const [lockEventTypeCreationForUsers, setLockEventTypeCreationForUsers] = useState(
    !!currentOrg.organizationSettings.lockEventTypeCreationForUsers
  );
  const [showModal, setShowModal] = useState(false);
  const { t } = useLocale();

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      reset(getValues());
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const formMethods = useForm<FormValues>({
    defaultValues: {
      currentEventTypeOptions: CurrentEventTypeOptions.HIDE,
    },
  });

  if (!isAdminOrOwner) return null;

  const currentLockedOption = formMethods.watch("currentEventTypeOptions");

  const { reset, getValues } = formMethods;

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      lockEventTypeCreation: lockEventTypeCreationForUsers,
      lockEventTypeCreationOptions: values.currentEventTypeOptions,
    });
    setShowModal(false);
  };

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("lock_org_users_eventtypes")}
        disabled={mutation?.isPending || !isAdminOrOwner}
        description={t("lock_org_users_eventtypes_description")}
        checked={lockEventTypeCreationForUsers}
        onCheckedChange={(checked) => {
          if (!checked) {
            mutation.mutate({
              lockEventTypeCreation: checked,
            });
          } else {
            setShowModal(true);
          }
          setLockEventTypeCreationForUsers(checked);
        }}
        switchContainerClassName="mt-6"
      />
      {showModal && (
        <Dialog
          open={showModal}
          onOpenChange={(e) => {
            if (!e) {
              setLockEventTypeCreationForUsers(
                !!currentOrg.organizationSettings.lockEventTypeCreationForUsers
              );
              setShowModal(false);
            }
          }}>
          <DialogContent enableOverflow>
            <Form form={formMethods} handleSubmit={onSubmit}>
              <div className="flex flex-row space-x-3">
                <div className="w-full pt-1">
                  <DialogHeader title={t("lock_event_types_modal_header")} />
                  <RadioArea.Group
                    id="currentEventTypeOptions"
                    onValueChange={(val: CurrentEventTypeOptions) => {
                      formMethods.setValue("currentEventTypeOptions", val);
                    }}
                    className={classNames("min-h-24 mt-1 flex flex-col gap-4")}>
                    <RadioArea.Item
                      checked={currentLockedOption === CurrentEventTypeOptions.HIDE}
                      value={CurrentEventTypeOptions.HIDE}
                      className={classNames("h-full text-sm")}>
                      <strong className="mb-1 block">{t("hide_org_eventtypes")}</strong>
                      <p>{t("org_hide_event_types_org_admin")}</p>
                    </RadioArea.Item>
                    <RadioArea.Item
                      checked={currentLockedOption === CurrentEventTypeOptions.DELETE}
                      value={CurrentEventTypeOptions.DELETE}
                      className={classNames("[&:has(input:checked)]:border-error h-full text-sm")}>
                      <strong className="mb-1 block">{t("delete_org_eventtypes")}</strong>
                      <p>{t("org_delete_event_types_org_admin")}</p>
                    </RadioArea.Item>
                  </RadioArea.Group>

                  <DialogFooter>
                    <DialogClose />
                    <Button disabled={!isAdminOrOwner} type="submit">
                      {t("submit")}
                    </Button>
                  </DialogFooter>
                </div>
              </div>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
