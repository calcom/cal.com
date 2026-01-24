"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RoutingFormWithResponseCount } from "@calcom/routing-forms/types/types";
import { Button } from "@calcom/ui/components/button";
import { DropdownMenuSeparator } from "@calcom/ui/components/dropdown";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { FormAction, FormActionsDropdown } from "./FormActions";
import { FormSettingsSlideover } from "./FormSettingsSlideover";

// Toggle group doesnt support HREF navigation, so we need to use this hook to handle navigation
const useRoutingFormNavigation = (
  form: RoutingFormWithResponseCount,
  appUrl: string,
  setShowInfoLostDialog: (value: boolean) => void
) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isDirty } = useFormContext<RoutingFormWithResponseCount>().formState;

  // Get the current page based on the pathname since we use a custom routing system
  const getCurrentPage = () => {
    const path = pathname || "";
    if (path.includes("/form-edit/")) return "form-edit";
    if (path.includes("/route-builder/")) return "route-builder";
    if (path.includes("/incomplete-booking/")) return "incomplete-booking";
    return "form-edit"; // default to form-edit if no match
  };

  const handleNavigation = (value: string) => {
    if (!value) return;

    const baseUrl = `${appUrl}/${value}/${form.id}`;

    if (value === "route-builder" && isDirty) {
      setShowInfoLostDialog(true);
    } else {
      router.push(baseUrl);
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
  setIsTestPreviewOpen,
  isTestPreviewOpen,
  isMobile = false,
  permissions,
}: {
  form: RoutingFormWithResponseCount;
  setIsTestPreviewOpen: (value: boolean) => void;
  isSaving: boolean;
  appUrl: string;
  isTestPreviewOpen: boolean;
  isMobile?: boolean;
  permissions: {
    canCreate: boolean;
    canRead: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}) => {
  const { t } = useLocale();
  const formContext = useFormContext<RoutingFormWithResponseCount>();
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center">
        <div className="flex gap-2">
          <Tooltip sideOffset={4} content={t("preview")} side="bottom">
            <Button
              color="secondary"
              data-testid={isMobile ? "preview-button-mobile" : "preview-button"}
              type="button"
              variant="icon"
              onClick={() => {
                setIsTestPreviewOpen(!isTestPreviewOpen);
              }}>
              {t("preview")}
            </Button>
          </Tooltip>
          <Tooltip sideOffset={4} content={t("settings")} side="bottom">
            <Button
              color="secondary"
              type="button"
              StartIcon="settings"
              data-testid={isMobile ? "settings-button-mobile" : "settings-button"}
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
              StartIcon="external-link">
              {t("view_form")}
            </FormAction>
            <FormAction
              action="incompleteBooking"
              className="w-full"
              routingForm={form}
              color="minimal"
              type="button"
              StartIcon="calendar">
              {t("routing_incomplete_booking_tab")}
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
              data-testid="download-responses"
              StartIcon="download">
              {t("download_responses")}
            </FormAction>
            {form?.id && (
              <FormAction
                action="viewResponses"
                routingForm={form}
                className="w-full"
                color="minimal"
                type="button"
                data-testid="view-responses"
                StartIcon="eye">
                {t("view_responses")}
              </FormAction>
            )}
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
              disabled={!permissions.canDelete}
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
                extraClassNames="hover:bg-subtle cursor-pointer rounded-[5px] px-3 py-2 transition"
              />
            </div>
          </FormActionsDropdown>
          <Button
            data-testid={isMobile ? "update-form-mobile" : "update-form"}
            loading={isSaving}
            disabled={!permissions.canEdit}
            type="submit"
            color="primary">
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
  setIsTestPreviewOpen,
  isTestPreviewOpen,
  permissions,
}: {
  routingForm: RoutingFormWithResponseCount;
  isSaving: boolean;
  appUrl: string;
  setShowInfoLostDialog: (value: boolean) => void;
  setIsTestPreviewOpen: (value: boolean) => void;
  isTestPreviewOpen: boolean;
  permissions: {
    canCreate: boolean;
    canRead: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}) {
  const { t } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(routingForm.name);
  const form = useFormContext<RoutingFormWithResponseCount>();

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
    <div className="bg-default flex flex-col lg:grid lg:grid-cols-3 lg:items-center">
      {/* Left - Back button and title */}
      <div className="border-muted flex items-center gap-2 border-b px-3 py-3 lg:px-4">
        <Button
          color="minimal"
          variant="icon"
          StartIcon="arrow-left"
          href={`${appUrl}`}
          data-testid="back-button"
        />
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
                className="text-default hover:bg-cal-muted min-w-0 cursor-pointer truncate whitespace-nowrap rounded px-1 text-sm font-semibold leading-none"
                onClick={() => setIsEditing(true)}>
                {watchedName || "Loading..."}
              </span>
              <Button
                variant="icon"
                color="minimal"
                onClick={() => setIsEditing(true)}
                CustomStartIcon={
                  <Icon name="pencil" className="text-subtle group-hover:text-default h-3 w-3" />
                }>
                <span className="sr-only">Edit</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet layout - Second row with toggle group and actions on the same row */}
      <div className="border-muted flex items-center justify-between gap-2 overflow-hidden border-b px-3 py-3 lg:hidden lg:px-4">
        {/* Navigation Tabs - Left aligned */}
        <div className="flex flex-shrink">
          <ToggleGroup
            defaultValue={getCurrentPage()}
            value={getCurrentPage()}
            onValueChange={handleNavigation}
            options={[
              {
                value: "form-edit",
                label: <span className="sr-only sm:not-sr-only">{t("form")}</span>,
                iconLeft: <Icon name="menu" className="h-3 w-3" />,
                dataTestId: "toggle-group-item-form-edit",
              },
              {
                value: "route-builder",
                label: <span className="sr-only sm:not-sr-only">{t("routing")}</span>,
                iconLeft: <Icon name="waypoints" className="h-3 w-3" />,
              },
            ]}
          />
        </div>

        {/* Actions - Right aligned */}
        <div className="flex min-w-0 flex-shrink-0">
          <Actions
            form={routingForm}
            setIsTestPreviewOpen={setIsTestPreviewOpen}
            isTestPreviewOpen={isTestPreviewOpen}
            isSaving={isSaving}
            appUrl={appUrl}
            isMobile={true}
            permissions={permissions}
          />{" "}
        </div>
      </div>

      {/* Desktop layout - Toggle group in center column */}
      <div className="border-muted hidden justify-center border-b px-3 py-3 lg:flex lg:px-4">
        <ToggleGroup
          defaultValue={getCurrentPage()}
          value={getCurrentPage()}
          onValueChange={handleNavigation}
          options={[
            {
              value: "form-edit",
              label: <span className="sr-only sm:not-sr-only">{t("form")}</span>,
              iconLeft: <Icon name="menu" className="h-3 w-3" />,
            },
            {
              value: "route-builder",
              label: <span className="sr-only sm:not-sr-only">{t("routing")}</span>,
              iconLeft: <Icon name="waypoints" className="h-3 w-3" />,
            },
          ]}
        />
      </div>

      {/* Desktop layout - Actions in right column */}
      <div className="border-muted hidden justify-end border-b px-3 py-3 lg:flex lg:px-4">
        <Actions
          form={routingForm}
          setIsTestPreviewOpen={setIsTestPreviewOpen}
          isTestPreviewOpen={isTestPreviewOpen}
          isSaving={isSaving}
          appUrl={appUrl}
          permissions={permissions}
        />
      </div>
    </div>
  );
}
