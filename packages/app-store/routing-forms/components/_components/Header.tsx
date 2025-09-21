"use client";

import { Profile } from "@calid/features/ui/Profile";
import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { HorizontalTabs } from "@calid/features/ui/components/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RoutingFormWithResponseCount } from "@calcom/routing-forms/types/types";

import { FormAction, FormActionsDropdown } from "../FormActions";
import { FormSettingsSlideover } from "./FormSettingsSlideover";

// Toggle group doesnt support HREF navigation, so we need to use this hook to handle navigation
const useRoutingFormNavigation = (
  form: RoutingFormWithResponseCount,
  appUrl: string,
  setShowInfoLostDialog: (value: boolean) => void
) => {
  const pathname = usePathname();
  const router = useRouter();
  const formContext = useFormContext<RoutingFormWithResponseCount>();

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

    if (value === "route-builder" && formContext.formState.isDirty) {
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
}: {
  form: RoutingFormWithResponseCount;
  setIsTestPreviewOpen: (value: boolean) => void;
  isSaving: boolean;
  appUrl: string;
  isTestPreviewOpen: boolean;
  isMobile?: boolean;
}) => {
  const { t } = useLocale();
  const formContext = useFormContext<RoutingFormWithResponseCount>();
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <FormAction
            variant="ghost"
            data-testid="toggle-form"
            action="toggle"
            routingForm={form}
            extraClassNames="hover:bg-subtle cursor-pointer rounded-[5px] pr-4 transition"
          />
          {/* <ButtonGroup combined className="border-r-subtle border-l-subtle"> */}
          <FormAction
            action="_delete"
            variant="fab"
            routingForm={form}
            size="xs"
            icon="trash"
            type="button"
            className="h-[34px] w-[40px]"
            color="destructive"></FormAction>
          <Button
            data-testid={isMobile ? "update-form-mobile" : "update-form"}
            variant="button"
            size="xs"
            className="h-[34px]"
            loading={isSaving}
            type="submit"
            color="primary">
            <span className='text-sm'>{t("save")}</span>
          </Button>
          {/* </ButtonGroup> */}
          <FormActionsDropdown>
            <FormAction
              action="incompleteBooking"
              variant="button"
              className="w-full"
              routingForm={form}
              color="primary"
              type="button">
              {t("routing_incomplete_booking_tab")}
            </FormAction>
            <FormAction action="copyLink" variant="icon" routingForm={form} color="minimal" type="button">
              {t("copy_link_to_form")}
            </FormAction>
            <FormAction
              action="download"
              variant="icon"
              routingForm={form}
              color="minimal"
              type="button"
              data-testid="download-responses">
              {t("download_responses")}
            </FormAction>
            {form?.id && (
              <FormAction
                variant="icon"
                action="viewResponses"
                routingForm={form}
                color="minimal"
                type="button"
                data-testid="view-responses">
                {t("view_responses")}
              </FormAction>
            )}
          </FormActionsDropdown>
          <FormAction variant="icon" data-testid="toggle-form" action="toggle" routingForm={form} />
          <FormAction
            action="_delete"
            variant="icon"
            routingForm={form}
            type="button"
            color="secondary"
            className="hover:bg-error hover:text-destructive h-8 w-8"
            StartIcon="trash-2"
          />
          <Button
            data-testid={isMobile ? "update-form-mobile" : "update-form"}
            variant="icon"
            loading={isSaving}
            type="submit">
            {t("save")}
          </Button>
          <Profile />
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
}: {
  routingForm: RoutingFormWithResponseCount;
  isSaving: boolean;
  appUrl: string;
  setShowInfoLostDialog: (value: boolean) => void;
  setIsTestPreviewOpen: (value: boolean) => void;
  isTestPreviewOpen: boolean;
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

  const searchParams = useSearchParams();

  const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = useMemo(() => {
    const queryString = searchParams?.toString() || "";

    const baseTabConfigs = [
      {
        name: "Details",
        path: `${appUrl}/details/${routingForm.id}`,
        "data-testid": "form-details",
      },
      {
        name: "Form",
        path: `${appUrl}/form-edit/${routingForm.id}`,
        "data-testid": "form-edit",
      },
      {
        name: "Routing",
        path: `${appUrl}/route-builder/${routingForm.id}`,
        "data-testid": "route-builder",
      },
      {
        name: "Embed",
        path: `${appUrl}/form-embed/${routingForm.id}`,
        "data-testid": "form-embed",
      },
    ];

    return baseTabConfigs.map((tabConfig) => ({
      name: tabConfig.name,
      href: queryString ? `${tabConfig.path}?${queryString}` : tabConfig.path,
      "data-testid": tabConfig["data-testid"],
    }));
  }, [searchParams?.toString()]);

  const watchedName = form.watch("name");

  return (
    <div className="bg-default sticky top-0 z-10 flex w-full flex-col">
      <div className="bg-default flex w-full flex-col lg:grid lg:grid-cols-3 lg:items-center">
        {/* Left - Back button and title */}
        <div className="border-muted flex items-center">
          <Link href={`${appUrl}`} data-testid="back-button">
            <Button
              type="button"
              color="minimal"
              variant="icon"
              data-testid="back-button"
              StartIcon="arrow-left"
            />
          </Link>

          <div className="flex min-w-0 flex-col items-start">
            <span className="text-default text-xl font-bold leading-none">{watchedName || "Loading..."}</span>
            <span className="text-subtle min-w-[100px] truncate whitespace-nowrap text-sm font-semibold ">
              {routingForm.description}
            </span>
          </div>
        </div>
        <div className="flex" />

        <div className="flex items-center justify-end space-x-4">
          <Actions
            form={routingForm}
            setIsTestPreviewOpen={setIsTestPreviewOpen}
            isTestPreviewOpen={isTestPreviewOpen}
            isSaving={isSaving}
            appUrl={appUrl}
          />
        </div>
      </div>
      <HorizontalTabs
        tabs={tabs.map((tab) => ({
          ...tab,
          name: t(tab.name),
        }))}
      />
    </div>
  );
}
