"use client";

import { useState } from "react";
import { z } from "zod";

import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

const EDITABLE_KEYS = ["paymentId", "subscriptionId", "subscriptionItemId"];

type Metadata = z.infer<typeof teamMetadataSchema>;

type AdminMetadataProps = {
  metadata: Metadata;
  entityType?: "team" | "organization";
  onUpdate?: (metadata: Record<string, string>) => Promise<void>;
  canEdit?: boolean;
};

export const AdminMetadata = ({
  metadata,
  entityType = "team",
  onUpdate,
  canEdit = false,
}: AdminMetadataProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const parseValidationErrors = (errorMessage: string) => {
    const errors: Record<string, string> = {};

    // Parse common validation error patterns
    if (errorMessage.includes("subscriptionId") && errorMessage.includes("sub_")) {
      errors.subscriptionId = "Must start with 'sub_'";
    }
    if (errorMessage.includes("subscriptionItemId") && errorMessage.includes("si_")) {
      errors.subscriptionItemId = "Must start with 'si_'";
    }

    setValidationErrors(errors);
  };

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};

    Object.entries(editedValues).forEach(([key, value]) => {
      if (value && value.trim()) {
        if (key === "subscriptionId" && !value.startsWith("sub_")) {
          errors[key] = "Must start with 'sub_'";
        }
        if (key === "subscriptionItemId" && !value.startsWith("si_")) {
          errors[key] = "Must start with 'si_'";
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  if (!metadata || typeof metadata !== "object" || Object.keys(metadata).length === 0) {
    return (
      <PanelCard title="Metadata">
        <div className="text-subtle p-4 text-sm">No metadata available.</div>
      </PanelCard>
    );
  }

  const metadataObj = metadata as Metadata;
  const entries = Object.entries(metadataObj);

  const hasChanges = Object.keys(editedValues).length > 0;

  const handleEdit = (key: string, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Clear validation error for this field when user edits
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedValues({});
    setValidationErrors({});
  };

  const handleSave = () => {
    // Validate before showing confirmation dialog
    if (validateFields()) {
      setShowConfirmDialog(true);
    } else {
      showToast("Please fix validation errors before saving", "error");
    }
  };

  const handleConfirmSave = async () => {
    if (!onUpdate) return;

    setIsSaving(true);
    try {
      await onUpdate(editedValues);
      showToast("Metadata updated successfully", "success");
      setIsEditing(false);
      setEditedValues({});
      setShowConfirmDialog(false);
      setValidationErrors({});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update metadata";
      showToast(errorMessage, "error");
      setShowConfirmDialog(false);
      parseValidationErrors(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayValue = (key: string, value: unknown): string => {
    if (isEditing && EDITABLE_KEYS.includes(key)) {
      return editedValues[key] !== undefined ? editedValues[key] : String(value ?? "");
    }
    return String(value ?? "");
  };

  const renderStaticValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-subtle italic">null</span>;
    }
    if (typeof value === "boolean") {
      return <Badge variant={value ? "green" : "gray"}>{value ? "true" : "false"}</Badge>;
    }
    if (typeof value === "object") {
      return (
        <pre className="bg-subtle overflow-x-auto rounded p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>
      );
    }
    if (typeof value === "string" && value.startsWith("http")) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-blue-600 hover:underline">
          {value}
        </a>
      );
    }
    return <span className="text-default break-all">{String(value)}</span>;
  };

  const getFieldHelper = (key: string): string | null => {
    if (key === "subscriptionId") return "Must start with 'sub_' or leave empty for nullable";
    if (key === "subscriptionItemId") return "Must start with 'si_' or leave empty for nullable";
    return null;
  };

  const renderValue = (key: string, value: unknown): React.ReactNode => {
    const isEditableKey = EDITABLE_KEYS.includes(key);
    const hasError = validationErrors[key];
    const helperText = getFieldHelper(key);

    if (isEditing && isEditableKey) {
      return (
        <div className="space-y-1">
          <TextField
            value={getDisplayValue(key, value)}
            onChange={(e) => handleEdit(key, e.target.value)}
            placeholder={`Enter ${key}`}
            className={`w-full ${hasError ? "border-red-500" : ""}`}
          />
          {hasError ? (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <Icon name="circle-alert" className="h-3 w-3" />
              <span>{hasError}</span>
            </div>
          ) : (
            helperText && (
              <div className="text-subtle flex items-center gap-1 text-xs">
                <Icon name="info" className="h-3 w-3" />
                <span>{helperText}</span>
              </div>
            )
          )}
        </div>
      );
    }

    return renderStaticValue(value);
  };

  return (
    <>
      <PanelCard
        title="Metadata"
        subtitle={`${entries.length} properties`}
        collapsible
        defaultCollapsed
        headerContent={
          canEdit && !isEditing ? (
            <Button color="minimal" size="sm" StartIcon="pencil" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : null
        }>
        <div className="divide-subtle divide-y">
          {entries.map(([key, value]) => (
            <div key={key} className="p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-emphasis font-mono text-sm font-medium">{key}</div>
                  {canEdit && EDITABLE_KEYS.includes(key) && (
                    <Badge variant="gray" className="text-xs">
                      Editable
                    </Badge>
                  )}
                </div>
                <div className="text-sm">{renderValue(key, value)}</div>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      {isEditing && (
        <div
          className="bg-inverted border-emphasis fixed z-50 min-w-[330px] rounded-lg border p-4 shadow-lg"
          style={{ bottom: "24px", right: "24px" }}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Icon name="info" className="text-inverted h-4 w-4" />
              <span className="text-inverted">
                {hasChanges ? "You have unsaved changes" : "Edit metadata values"}
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button color="minimal" onClick={handleCancel} className="text-white">
                Cancel
              </Button>
              <Button
                className="text-white"
                color="primary"
                onClick={handleSave}
                disabled={!hasChanges}
                loading={isSaving}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <ConfirmationDialogContent
          variety="warning"
          title="Confirm Metadata Changes"
          confirmBtnText="Save Changes"
          onConfirm={handleConfirmSave}>
          <div className="space-y-3">
            <p className="text-default text-sm">You are about to update the following metadata fields:</p>
            <div className="bg-muted border-muted max-h-[400px] space-y-3 overflow-y-auto rounded border p-3">
              {Object.entries(editedValues).map(([key, value]) => {
                const oldValue = metadataObj[key];

                return (
                  <div key={key} className="space-y-2">
                    <div className="text-emphasis text-xs font-semibold uppercase">{key}</div>
                    <div className="space-y-1">
                      {/* Old Value */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1 rounded border border-red-200 bg-red-50 p-2">
                          <div className="break-all font-mono text-xs text-red-900">
                            {oldValue || "(empty)"}
                          </div>
                        </div>
                      </div>
                      {/* New Value */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1 rounded border border-green-200 bg-green-50 p-2">
                          <div className="break-all font-mono text-xs text-green-900">
                            {value || "(empty)"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-subtle text-sm">
              This action will modify the {entityType}&apos;s billing metadata. Are you sure you want to
              continue?
            </p>
          </div>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
