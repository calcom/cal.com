"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ButtonOrLink,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { Switch } from "@calid/features/ui/components/switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";

import type { DeleteDialogState } from "../types/event-types";
import { DeleteEventDialog } from "./delete-event-dialog";

interface EventTypeActionsProps {
  form: UseFormReturn<FormValues>;
  eventTypesLockedByOrg?: boolean;
  permalink: string;
  hasPermsToDelete: boolean;
  isUpdatePending: boolean;
  handleSubmit: (values: FormValues) => Promise<void>;
  onDelete: () => void;
  eventTypeId: number;
  isDeleting?: boolean;
  isFormInitialized?: boolean;
}

export const EventTypeActions = ({
  form,
  eventTypesLockedByOrg,
  permalink,
  hasPermsToDelete,
  isUpdatePending,
  handleSubmit,
  onDelete,
  eventTypeId,
  isDeleting = false,
  isFormInitialized = true,
}: EventTypeActionsProps) => {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    typeId: eventTypeId,
    schedulingType: null,
  });

  const isManagedEventType = (() => {
    try {
      const schedulingType = form?.getValues("schedulingType");
      return schedulingType === SchedulingType.MANAGED;
    } catch (error) {
      return false;
    }
  })();

  const isChildrenManagedEventType = (() => {
    try {
      const metadata = form?.getValues("metadata");
      const schedulingType = form?.getValues("schedulingType");
      return metadata?.managedEventConfig !== undefined && schedulingType !== SchedulingType.MANAGED;
    } catch (error) {
      return false;
    }
  })();

  const shouldHideRedirectAndCopy = isManagedEventType || isChildrenManagedEventType;

  const handleDeleteClick = () => {
    try {
      const schedulingType = form?.getValues("schedulingType");
      setDeleteDialog({
        open: true,
        typeId: eventTypeId,
        schedulingType: schedulingType || null,
      });
    } catch (error) {
      setDeleteDialog({
        open: true,
        typeId: eventTypeId,
        schedulingType: null,
      });
    }
  };

  const handleDeleteConfirm = () => {
    onDelete();
  };

  const handleDeleteClose = () => {
    setDeleteDialog({
      open: false,
      typeId: eventTypeId,
      schedulingType: null,
    });
  };
  // Enhanced dirty check to prevent false positives
  const isFormDirty = (() => {
    try {
      // Don't show as dirty until initialized
      if (!isFormInitialized) return false;

      const formIsDirty = form?.formState?.isDirty || false;
      if (!formIsDirty) return false;

      // Check if current values actually differ from default values
      const currentValues = form.getValues();
      const defaultValues = form.formState.defaultValues;

      const hasActualChanges = Object.keys(form.formState.dirtyFields || {}).some((key) => {
        const currentValue = currentValues[key as keyof FormValues];
        const defaultValue = defaultValues?.[key as keyof FormValues];

        // Special handling for boolean toggles in Advanced tab
        if (key === "allowReschedulingCancelledBookings" || key === "seatsPerTimeSlotEnabled") {
          const current = Boolean(currentValue);
          const defaultVal = Boolean(defaultValue);
          return current !== defaultVal;
        }

        // Special handling for requiresConfirmation (affected by seats toggle)
        if (key === "requiresConfirmation") {
          const current = Boolean(currentValue);
          const defaultVal = Boolean(defaultValue);
          return current !== defaultVal;
        }

        // Special handling for successRedirectUrl (empty string vs actual URL)
        if (key === "successRedirectUrl") {
          const current = currentValue || "";
          const defaultVal = defaultValue || "";
          return current !== defaultVal;
        }

        // Special handling for interfaceLanguage and locations
        if (key === "interfaceLanguage") {
          const current = currentValue || "";
          const defaultVal = defaultValue || "";
          return current !== defaultVal;
        }

        if (key === "locations") {
          const current = JSON.stringify(currentValue || []);
          const defaultVal = JSON.stringify(defaultValue || []);
          return current !== defaultVal;
        }

        // Special handling for Apps tab metadata to fix toggle reset issue
        if (key === "metadata" && currentValue && defaultValue) {
          const currentMetadata = currentValue as Record<string, unknown>;
          const defaultMetadata = defaultValue as Record<string, unknown>;
          const currentApps = (currentMetadata?.apps as Record<string, unknown>) || {};
          const defaultApps = (defaultMetadata?.apps as Record<string, unknown>) || {};

          // Check if apps have actual changes
          const appKeys = new Set([...Object.keys(currentApps), ...Object.keys(defaultApps)]);
          const hasAppChanges = Array.from(appKeys).some((appKey) => {
            const currentApp = currentApps[appKey] || {};
            const defaultApp = defaultApps[appKey] || {};

            // Compare enabled state specifically
            const currentEnabled = currentApp.enabled || false;
            const defaultEnabled = defaultApp.enabled || false;

            return currentEnabled !== defaultEnabled;
          });

          if (hasAppChanges) return true;

          // For non-app metadata, use regular comparison
          const currentNonApps = { ...(currentValue as Record<string, unknown>) };
          const defaultNonApps = { ...(defaultValue as Record<string, unknown>) };
          delete currentNonApps.apps;
          delete defaultNonApps.apps;

          return JSON.stringify(currentNonApps) !== JSON.stringify(defaultNonApps);
        }

        // Regular comparison for all other fields (preserves existing behavior)
        return JSON.stringify(currentValue) !== JSON.stringify(defaultValue);
      });

      return hasActualChanges;
    } catch (error) {
      return false;
    }
  })();

  return (
    <div className="mr-2 flex items-center justify-end space-x-4">
      {/* Mobile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="lg:hidden" StartIcon="ellipsis" variant="icon" color="secondary" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!shouldHideRedirectAndCopy && (
            <DropdownMenuItem>
              <ButtonOrLink
                target="_blank"
                rel="noreferrer"
                type="button"
                href={permalink}
                className="flex w-full items-center">
                <Icon name="external-link" className="mr-2 h-4 w-4" />
                {t("preview")}
              </ButtonOrLink>
            </DropdownMenuItem>
          )}
          {!shouldHideRedirectAndCopy && (
            <DropdownMenuItem>
              <ButtonOrLink
                type="button"
                onClick={() => {
                  copyToClipboard(permalink);
                  triggerToast(t("link_copied"), "success");
                }}
                className="flex w-full items-center">
                <Icon name="link" className="mr-2 h-4 w-4" />
                {t("copy_link")}
              </ButtonOrLink>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={!hasPermsToDelete}>
            <ButtonOrLink
              type="button"
              onClick={handleDeleteClick}
              className="text-destructive flex w-full items-center">
              <Icon name="trash" className="mr-2 h-4 w-4" />
              {t("delete")}
            </ButtonOrLink>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden toggle */}
      {(() => {
        try {
          const metadata = form?.getValues("metadata");
          return !metadata?.managedEventConfig;
        } catch (error) {
          return true;
        }
      })() && (
        <div className="flex items-center space-x-2">
          <Switch
            id="hiddenSwitch"
            disabled={eventTypesLockedByOrg}
            tooltip={form.getValues("hidden") ? t("show_eventtype_on_profile") : t("hide_from_profile")}
            tooltipSide="bottom"
            checked={(() => {
              try {
                const hidden = form?.getValues("hidden");
                return !hidden;
              } catch (error) {
                return true;
              }
            })()}
            onCheckedChange={(e) => {
              try {
                form?.setValue("hidden", !e, { shouldDirty: true });
              } catch (error) {
                console.error("EventTypeActions - Error setting hidden value:", error);
              }
            }}
          />
        </div>
      )}

      {/* Action buttons - hidden on mobile */}
      <ButtonGroup containerProps={{ className: "hidden lg:flex" }}>
        {!shouldHideRedirectAndCopy && (
          <Tooltip content={t("preview")}>
            <Button
              color="secondary"
              variant="icon"
              href={permalink}
              target="_blank"
              rel="noreferrer"
              StartIcon="external-link"
            />
          </Tooltip>
        )}

        {!shouldHideRedirectAndCopy && (
          <Button
            color="secondary"
            variant="icon"
            StartIcon="link"
            tooltip={t("copy_link")}
            onClick={() => {
              copyToClipboard(permalink);
              triggerToast(t("link_copied"), "success");
            }}
          />
        )}

        <Button
          color="secondary"
          className="text-error enabled:hover:text-error"
          variant="icon"
          StartIcon="trash"
          tooltip={t("delete")}
          disabled={!hasPermsToDelete}
          onClick={handleDeleteClick}
        />
      </ButtonGroup>

      <Button
        type="button"
        loading={isUpdatePending}
        onClick={() => handleSubmit(form.getValues())}
        disabled={!isFormDirty || isUpdatePending}
        form="event-type-form">
        {t("save")}
      </Button>

      <DeleteEventDialog
        deleteDialog={deleteDialog}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};
