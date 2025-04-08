"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RoutingFormWithResponseCount } from "@calcom/routing-forms/types/types";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { DropdownMenuSeparator } from "@calcom/ui/components/dropdown";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { enabledIncompleteBookingApps } from "../../lib/enabledIncompleteBookingApps";
import { FormAction, FormActionsDropdown } from "../FormActions";
import { FormSettingsSlideover } from "./FormSettingsSlideover";

const useRoutingFormNavigation = (
  form: RoutingFormWithResponseCount,
  appUrl: string,
  setShowInfoLostDialog: (value: boolean) => void
) => {
  const pathname = usePathname();
  const formContext = useFormContext<RoutingFormWithResponseCount>();

  const getCurrentPage = () => {
    const path = pathname || "";
    if (path.includes("/form-edit/")) return "form-edit";
    if (path.includes("/route-builder/")) return "route-builder";
    if (path.includes("/reporting/")) return "reporting";
    if (path.includes("/incomplete-booking/")) return "incomplete-booking";
    return "form-edit"; // default to form-edit if no match
  };

  const handleNavigation = (value: string) => {
    if (!value) return;

    const baseUrl = `${appUrl}/${value}/${form.id}`;

    if (value === "route-builder" && formContext.formState.isDirty) {
      setShowInfoLostDialog(true);
    } else if (value === "reporting") {
      window.open(baseUrl, "_blank");
    } else {
      window.location.href = baseUrl;
    }
  };

  return {
    getCurrentPage,
    handleNavigation,
  };
};

const Actions = ({
  form,
  isSaving,
  appUrl,
}: {
  form: RoutingFormWithResponseCount;
  isSaving: boolean;
  appUrl: string;
}) => {
  const { t } = useLocale();
  const formContext = useFormContext<RoutingFormWithResponseCount>();
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center">
        <div className="flex gap-2">
          <Tooltip sideOffset={4} content={t("preview")} side="bottom">
            <FormAction
              routingForm={form}
              color="secondary"
              target="_blank"
              type="button"
              rel="noreferrer"
              action="preview">
              {t("preview")}
            </FormAction>
          </Tooltip>
          <Tooltip sideOffset={4} content={t("settings")} side="bottom">
            <Button
              color="secondary"
              type="button"
              variant="icon"
              StartIcon="settings"
              onClick={() => {
                setIsSettingsDialogOpen(true);
              }}
            />
          </Tooltip>
          <FormActionsDropdown>
            <FormAction
              routingForm={form}
              color="minimal"
              target="_blank"
              type="button"
              rel="noreferrer"
              action="preview"
              className="md:hidden"
              StartIcon="external-link">
              {t("preview")}
            </FormAction>
            <FormAction
              action="copyLink"
              className="w-full"
              routingForm={form}
              color="minimal"
              type="button"
              StartIcon="link">
              {t("copy_link_to_form")}
            </FormAction>
            <FormAction
              action="download"
              routingForm={form}
              className="w-full"
              color="minimal"
              type="button"
              StartIcon="download">
              {t("download_responses")}
            </FormAction>
            <FormAction
              action="embed"
              routingForm={form}
              color="minimal"
              type="button"
              className="w-full"
              StartIcon="code">
              {t("embed")}
            </FormAction>
            <DropdownMenuSeparator className="hidden sm:block" />
            <FormAction
              action="_delete"
              routingForm={form}
              className="w-full"
              type="button"
              color="destructive"
              StartIcon="trash">
              {t("delete")}
            </FormAction>
            <div className="block sm:hidden">
              <DropdownMenuSeparator />
              <FormAction
                data-testid="toggle-form"
                action="toggle"
                routingForm={form}
                label="Disable Form"
                extraClassNames="hover:bg-subtle cursor-pointer rounded-[5px] pr-4 transition"
              />
            </div>
          </FormActionsDropdown>
          <Button data-testid="update-form" loading={isSaving} type="submit" color="primary">
            {t("save")}
          </Button>
        </div>
      </div>
      <FormSettingsSlideover
        hookForm={formContext}
        form={form}
        isOpen={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        appUrl={appUrl}
      />
    </>
  );
};

export function Header({
  routingForm,
  isSaving,
  appUrl,
  setShowInfoLostDialog,
}: {
  routingForm: RoutingFormWithResponseCount;
  isSaving: boolean;
  appUrl: string;
  setShowInfoLostDialog: (value: boolean) => void;
}) {
  const { t } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(routingForm.name);
  const form = useFormContext<RoutingFormWithResponseCount>();

  const { data } = trpc.viewer.appRoutingForms.getIncompleteBookingSettings.useQuery({
    formId: routingForm.id,
  });

  const showIncompleteBookingTab = data?.credentials.some((credential) =>
    enabledIncompleteBookingApps.includes(credential?.appId ?? "")
  );

  const { getCurrentPage, handleNavigation } = useRoutingFormNavigation(
    routingForm,
    appUrl,
    setShowInfoLostDialog
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleSubmit = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      form.setValue("name", title);
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      form.setValue("name", routingForm.name);
      setIsEditing(false);
    }
  };

  const watchedName = form.watch("name");

  return (
    <div className="bg-default border-muted flex items-center justify-between border-b px-4 py-3">
      {/* Left */}
      <div className="flex items-center gap-2">
        <Button color="minimal" variant="icon" StartIcon="arrow-left" />
        <div className="flex min-w-0 items-center">
          <span className="text-subtle min-w-content text-sm font-semibold leading-none">
            {t("routing_form")}
          </span>
          <span className="text-subtle mx-1 text-sm font-semibold leading-none">/</span>
          {isEditing ? (
            <input
              {...form.register("name")}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleTitleSubmit}
              className="text-default h-auto w-full whitespace-nowrap border-none p-0 text-sm font-semibold leading-none focus:ring-0"
              autoFocus
            />
          ) : (
            <div className="group flex items-center gap-1">
              <span
                className="text-default hover:bg-muted min-w-[100px] cursor-pointer truncate whitespace-nowrap rounded px-1 text-sm font-semibold leading-none"
                onClick={() => setIsEditing(true)}>
                {watchedName}
              </span>
              <Icon name="pencil" className="text-subtle group-hover:text-default h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center">
        <ToggleGroup
          defaultValue={getCurrentPage()}
          value={getCurrentPage()}
          onValueChange={handleNavigation}
          options={[
            {
              value: "form-edit",
              label: t("form"),
              iconLeft: <Icon name="menu" className="h-3 w-3" />,
            },
            {
              value: "route-builder",
              label: t("routing"),
              iconLeft: <Icon name="waypoints" className="h-3 w-3" />,
            },
            {
              value: "reporting",
              label: t("reporting"),
              iconLeft: <Icon name="chart-bar" className="h-3 w-3" />,
            },
            ...(showIncompleteBookingTab
              ? [
                  {
                    value: "incomplete-booking",
                    label: t("incomplete_booking"),
                    iconLeft: <Icon name="calendar" className="h-3 w-3" />,
                  },
                ]
              : []),
          ]}
        />
      </div>

      {/* Actions */}
      <Actions form={routingForm} isSaving={isSaving} appUrl={appUrl} />
    </div>
  );
}
