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
import { Lock } from "@calcom/ui/components/icon";

enum CurrentEventTypeOptions {
  DELETE = "DELETE",
  HIDE = "HIDE",
  LEAVE_ON_PROFILE = "LEAVE_ON_PROFILE",
}

interface GeneralViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
  isAdminOrOwner: boolean;
}

export const LockEventTypeSwitch = ({ currentOrg, isAdminOrOwner }: GeneralViewProps) => {
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

  const formMethods = useForm<{
    lockEventTypeCreationForUsers: boolean;
    currentEventTypeOptions: CurrentEventTypeOptions;
  }>({
    defaultValues: {
      lockEventTypeCreationForUsers: !!currentOrg.organizationSettings.lockEventTypeCreationForUsers,
      currentEventTypeOptions: CurrentEventTypeOptions.HIDE,
    },
  });

  const lockEventTypeCreationForUsers = formMethods.watch("lockEventTypeCreationForUsers");

  const {
    formState: { isDirty, isSubmitting, isSubmitSuccessful },
    reset,
    getValues,
    register,
  } = formMethods;
  const isDisabled = isSubmitting || !isDirty || !isAdminOrOwner;

  const modalOpen =
    lockEventTypeCreationForUsers &&
    !currentOrg.organizationSettings.lockEventTypeCreationForUsers &&
    !isSubmitSuccessful;

  return (
    <Form
      form={formMethods}
      handleSubmit={(value) => {
        console.log(value);
      }}>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("lock_users_eventtypes")}
        disabled={mutation?.isPending}
        description={t("lock_users_eventtypes_description")}
        checked={lockEventTypeCreationForUsers}
        onCheckedChange={(checked) => {
          console.log({ checked });
          formMethods.setValue("lockEventTypeCreationForUsers", checked);
          if (!checked) {
            mutation.mutate({
              lockEventTypeCreation: checked,
            });
          }
        }}
        switchContainerClassName="mt-6"
      />
      {modalOpen && (
        <Dialog
          open={modalOpen}
          onOpenChange={(e) => {
            if (!e) {
              formMethods.setValue(
                "lockEventTypeCreationForUsers",
                !!currentOrg.organizationSettings.lockEventTypeCreationForUsers
              );
            }
          }}>
          <DialogContent enableOverflow>
            <div className="flex flex-row space-x-3">
              <div className="bg-subtle flex h-10 w-10 flex-shrink-0 justify-center rounded-full ">
                <Lock className="m-auto h-6 w-6" />
              </div>
              <div className="w-full pt-1">
                <DialogHeader
                  title={t("lock_event_types_modal_header")}
                  subtitle={
                    <label htmlFor="currentEventTypeOptions">{t("lock_event_types_modal_description")}</label>
                  }
                />
                <RadioArea.Group
                  id="currentEventTypeOptions"
                  onValueChange={(val: CurrentEventTypeOptions) => {
                    formMethods.setValue("currentEventTypeOptions", val);
                  }}
                  className={classNames("min-h-24 mt-1 flex flex-col gap-4")}>
                  <RadioArea.Item
                    {...register("currentEventTypeOptions")}
                    value={CurrentEventTypeOptions.HIDE}
                    className={classNames("h-full text-sm")}>
                    <strong className="mb-1 block">{t("hide")}</strong>
                  </RadioArea.Item>
                  <RadioArea.Item
                    {...register("currentEventTypeOptions")}
                    value={CurrentEventTypeOptions.DELETE}
                    className={classNames("h-full text-sm")}>
                    <strong className="mb-1 block">{t("delete")}</strong>
                  </RadioArea.Item>
                  <RadioArea.Item
                    {...register("currentEventTypeOptions")}
                    value={CurrentEventTypeOptions.LEAVE_ON_PROFILE}
                    className={classNames("h-full text-sm")}>
                    <strong className="mb-1 block">{t("leave_on_profile")}</strong>
                    <p>{t("round_robin_description")}</p>
                  </RadioArea.Item>
                </RadioArea.Group>

                <DialogFooter>
                  <DialogClose />
                  <Button type="submit" disabled={isDisabled}>
                    {t("submit")}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Form>
  );
};
