"use client";

import Link from "next/link";
import { useRef } from "react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { TeamMemberSelect } from "@calcom/app-store/routing-forms/components/_components/TeamMemberSelect";
import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Switch, TextAreaField, TextField } from "@calcom/ui/components/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@calcom/ui/components/sheet";

type FormSettingsSlideoverProps = {
  form: RoutingFormWithResponseCount;
  hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appUrl: string;
};

export const FormSettingsSlideover = ({
  form,
  hookForm,
  isOpen,
  onOpenChange,
  appUrl,
}: FormSettingsSlideoverProps) => {
  const { t } = useLocale();
  const { data: user } = useMeQuery();
  const sendUpdatesTo = hookForm.watch("settings.sendUpdatesTo") || [];
  const sendToAll = hookForm.watch("settings.sendToAll") || false;

  // Store initial form values
  const initialValuesRef = useRef({
    name: hookForm.getValues("name"),
    description: hookForm.getValues("description"),
    settings: {
      sendUpdatesTo: hookForm.getValues("settings.sendUpdatesTo") || [],
      sendToAll: hookForm.getValues("settings.sendToAll") || false,
      emailOwnerOnSubmission: hookForm.getValues("settings.emailOwnerOnSubmission") || false,
    },
  });

  const handleCancel = () => {
    // Revert only the fields we edit
    const initialValues = initialValuesRef.current;
    hookForm.setValue("name", initialValues.name);
    hookForm.setValue("description", initialValues.description);
    hookForm.setValue("settings.sendUpdatesTo", initialValues.settings.sendUpdatesTo);
    hookForm.setValue("settings.sendToAll", initialValues.settings.sendToAll);
    hookForm.setValue("settings.emailOwnerOnSubmission", initialValues.settings.emailOwnerOnSubmission);
    onOpenChange(false);
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        } else {
          onOpenChange(open);
        }
      }}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("form_settings")}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex-1 overflow-y-auto">
          <TextField
            type="text"
            containerClassName="mb-6"
            placeholder={t("title")}
            {...hookForm.register("name")}
            data-testid="name"
          />
          <TextAreaField
            rows={3}
            id="description"
            data-testid="description"
            placeholder={t("form_description_placeholder")}
            {...hookForm.register("description")}
            defaultValue={form.description || ""}
          />

          <div className="mt-6">
            {form.teamId ? (
              <div className="flex flex-col">
                <TeamMemberSelect
                  teamMembers={form.teamMembers}
                  selectedMembers={sendUpdatesTo}
                  onChange={(memberIds) => {
                    hookForm.setValue("settings.sendUpdatesTo", memberIds, { shouldDirty: true });
                    hookForm.setValue("settings.emailOwnerOnSubmission", false, {
                      shouldDirty: true,
                    });
                  }}
                  onSelectAll={(selectAll) => {
                    hookForm.setValue("settings.sendToAll", selectAll, { shouldDirty: true });
                  }}
                  selectAllEnabled={true}
                  sendToAll={sendToAll}
                  placeholder={t("select_members")}
                />
              </div>
            ) : (
              <Controller
                name="settings.emailOwnerOnSubmission"
                control={hookForm.control}
                render={({ field: { value, onChange } }) => {
                  return (
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="emailOwnerOnSubmission"
                        className="text-default text-sm font-medium leading-none">
                        {t("routing_forms_send_email_owner")}
                      </label>
                      <Switch
                        size="sm"
                        id="emailOwnerOnSubmission"
                        checked={value}
                        onCheckedChange={(val) => {
                          onChange(val);
                          hookForm.unregister("settings.sendUpdatesTo");
                        }}
                      />
                    </div>
                  );
                }}
              />
            )}
          </div>

          {form.routers.length ? (
            <div className="mt-6">
              <div className="text-emphasis mb-2 block text-sm font-semibold leading-none">
                {t("routers")}
              </div>
              <p className="text-default -mt-1 text-xs leading-normal">
                {t("modifications_in_fields_warning")}
              </p>
              <div className="flex">
                {form.routers.map((router) => {
                  return (
                    <div key={router.id} className="mr-2">
                      <Link href={`${appUrl}/route-builder/${router.id}`}>
                        <Badge variant="gray">{router.name}</Badge>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {form.connectedForms?.length ? (
            <div className="mt-6">
              <div className="text-emphasis mb-2 block text-sm font-semibold leading-none">
                {t("connected_forms")}
              </div>
              <p className="text-default -mt-1 text-xs leading-normal">{t("form_modifications_warning")}</p>
              <div className="flex">
                {form.connectedForms.map((router) => {
                  return (
                    <div key={router.id} className="mr-2">
                      <Link href={`${appUrl}/route-builder/${router.id}`}>
                        <Badge variant="default">{router.name}</Badge>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex gap-2">
            {IS_CALCOM && (
              <Button
                target="_blank"
                color="minimal"
                href={`https://i.cal.com/support/routing-support-session?email=${encodeURIComponent(
                  user?.email ?? ""
                )}&name=${encodeURIComponent(user?.name ?? "")}&form=${encodeURIComponent(form.id)}`}>
                {t("need_help")}
              </Button>
            )}
          </div>
        </div>
        <SheetFooter className="shrink-0 ">
          <Button color="minimal" onClick={handleCancel} data-testid="settings-slider-over-cancel">
            {t("cancel")}
          </Button>
          <Button onClick={() => onOpenChange(false)} data-testid="settings-slider-over-done">
            {t("done")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
