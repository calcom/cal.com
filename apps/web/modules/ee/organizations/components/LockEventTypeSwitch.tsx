import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Form } from "@coss/ui/components/form";
import { Radio, RadioGroup } from "@coss/ui/components/radio-group";
import { toastManager } from "@coss/ui/components/toast";
import { cn } from "@coss/ui/lib/utils";
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";
import { useState } from "react";
import { useForm } from "react-hook-form";

enum CurrentEventTypeOptions {
  DELETE = "DELETE",
  HIDE = "HIDE",
}

interface GeneralViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
}

interface FormValues {
  currentEventTypeOptions: CurrentEventTypeOptions;
}

export const LockEventTypeSwitch = ({ currentOrg }: GeneralViewProps) => {
  const [lockEventTypeCreationForUsers, setLockEventTypeCreationForUsers] =
    useState(!!currentOrg.organizationSettings.lockEventTypeCreationForUsers);
  const [showModal, setShowModal] = useState(false);
  const { t } = useLocale();

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      reset(getValues());
      toastManager.add({
        title: t("settings_updated_successfully"),
        type: "success",
      });
    },
    onError: () => {
      toastManager.add({ title: t("error_updating_settings"), type: "error" });
    },
  });

  const formMethods = useForm<FormValues>({
    defaultValues: {
      currentEventTypeOptions: CurrentEventTypeOptions.HIDE,
    },
  });

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
        title={t("lock_org_users_eventtypes")}
        disabled={mutation?.isPending}
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
      />
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) {
            setLockEventTypeCreationForUsers(
              !!currentOrg.organizationSettings.lockEventTypeCreationForUsers
            );
            setShowModal(false);
          }
        }}
        onOpenChangeComplete={(open) => {
          if (!open) {
            reset();
          }
        }}
      >
        <DialogPopup className="max-w-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="mb-2">
              {t("lock_event_types_modal_header")}
            </DialogTitle>
          </DialogHeader>
          <Form
            className="contents"
            onSubmit={formMethods.handleSubmit(onSubmit)}
          >
            <DialogPanel>
              <RadioGroup
                value={currentLockedOption}
                onValueChange={(val) => {
                  formMethods.setValue(
                    "currentEventTypeOptions",
                    val as CurrentEventTypeOptions
                  );
                }}
                className="flex flex-col gap-4"
              >
                <label
                  className={cn(
                    "flex gap-3 items-start p-4 rounded-md border transition-colors cursor-pointer border-subtle",
                    "has-[[data-checked]]:border-emphasis has-[[data-checked]]:ring-1 has-[[data-checked]]:ring-emphasis"
                  )}
                >
                  <Radio
                    value={CurrentEventTypeOptions.HIDE}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      {t("hide_org_eventtypes")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("org_hide_event_types_org_admin")}
                    </span>
                  </div>
                </label>
                <label
                  className={cn(
                    "flex gap-3 items-start p-4 rounded-md border transition-colors cursor-pointer border-subtle",
                    "has-[[data-checked]]:border-destructive has-[[data-checked]]:ring-1 has-[[data-checked]]:ring-destructive"
                  )}
                >
                  <Radio
                    value={CurrentEventTypeOptions.DELETE}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      {t("delete_org_eventtypes")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("org_delete_event_types_org_admin")}
                    </span>
                  </div>
                </label>
              </RadioGroup>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                {t("cancel")}
              </DialogClose>
              <Button type="submit">{t("submit")}</Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>
    </>
  );
};
