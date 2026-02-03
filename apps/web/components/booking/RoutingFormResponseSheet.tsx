"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@calcom/ui/components/sheet";

interface RoutingFormResponseSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  formResponseId: number;
}

type FieldOption = {
  label: string;
  id: string | null;
};

/**
 * For select/multiselect fields, map the stored value (option ID) to the display label.
 * Handles both legacy format (where id is null and label is used as value) and new format (where id is used as value).
 */
function getDisplayValueForSelectField(
  value: string | number | string[],
  options: FieldOption[] | undefined
): string {
  if (!options || options.length === 0) {
    // Not a select field or no options defined, return value as-is
    return Array.isArray(value) ? value.join(", ") : String(value);
  }

  // Check if options are in legacy format (id is null)
  const isLegacyFormat = options.some((opt) => opt.id === null);

  const findLabel = (val: string | number): string => {
    const stringVal = String(val);
    const option = options.find((opt) => {
      if (isLegacyFormat) {
        // Legacy format: value is stored as label
        return opt.label === stringVal;
      }
      // New format: value is stored as id
      return opt.id === stringVal;
    });
    return option?.label ?? stringVal;
  };

  if (Array.isArray(value)) {
    return value.map(findLabel).join(", ");
  }

  return findLabel(value);
}

export function RoutingFormResponseSheet({
  isOpen,
  setIsOpen,
  formResponseId,
}: RoutingFormResponseSheetProps) {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.appRoutingForms.getResponseWithFormFields.useQuery(
    { formResponseId },
    {
      enabled: isOpen && !!formResponseId,
      staleTime: 10 * 60 * 1000,
    }
  );

  // Get fields in order from the form definition and match with responses
  const orderedResponses =
    data?.form?.fields
      ?.map((field) => {
        const response = data.response[field.id];
        if (!response) return null;

        // Get the display value - for select/multiselect, map IDs to labels
        const isSelectField = field.type === "select" || field.type === "multiselect";
        const displayValue = isSelectField
          ? getDisplayValueForSelectField(response.value, field.options)
          : Array.isArray(response.value)
            ? response.value.join(", ")
            : String(response.value);

        return {
          fieldId: field.id,
          label: field.label,
          displayValue,
        };
      })
      .filter(Boolean) ?? [];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("form_submission")}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {isLoading && (
            <div className="flex flex-col gap-4 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                  <div className="bg-muted h-5 w-full animate-pulse rounded" />
                </div>
              ))}
            </div>
          )}
          {!isLoading && orderedResponses.length === 0 && (
            <p className="text-subtle text-sm">{t("no_responses_found")}</p>
          )}
          {!isLoading && orderedResponses.length > 0 && (
            <div className="flex flex-col gap-4">
              {data?.form?.name && (
                <div className="border-subtle border-b pb-3">
                  <p className="text-emphasis text-sm font-medium">{data.form.name}</p>
                  {data.form.description && (
                    <p className="text-subtle text-xs">{data.form.description}</p>
                  )}
                </div>
              )}
              {orderedResponses.map((item) => {
                if (!item) return null;
                return (
                  <div key={item.fieldId} className="flex flex-col gap-1">
                    <label className="text-subtle text-xs font-medium uppercase tracking-wide">
                      {item.label}
                    </label>
                    <p className="text-emphasis text-sm">{item.displayValue}</p>
                  </div>
                );
              })}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
