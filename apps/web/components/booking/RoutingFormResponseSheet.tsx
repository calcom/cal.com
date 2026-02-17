"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@calcom/ui/components/sheet";

interface RoutingFormResponseSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  formResponseId: number;
}

export function RoutingFormResponseSheet({
  isOpen,
  setIsOpen,
  formResponseId,
}: RoutingFormResponseSheetProps) {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.appRoutingForms.getFormResponseDisplay.useQuery(
    { formResponseId },
    {
      enabled: isOpen && !!formResponseId,
      staleTime: 10 * 60 * 1000,
    }
  );

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
          {!isLoading && (!data?.responses || data.responses.length === 0) && (
            <p className="text-subtle text-sm">{t("no_responses_found")}</p>
          )}
          {!isLoading && data?.responses && data.responses.length > 0 && (
            <div className="flex flex-col gap-4">
              {data.form?.name && (
                <div className="border-subtle border-b pb-3">
                  <p className="text-emphasis text-sm font-medium">{data.form.name}</p>
                  {data.form.description && (
                    <p className="text-subtle text-xs">{data.form.description}</p>
                  )}
                </div>
              )}
              {data.responses.map((item) => (
                <div key={item.fieldId} className="flex flex-col gap-1">
                  <label className="text-subtle text-xs font-medium uppercase tracking-wide">
                    {item.label}
                  </label>
                  <p className="text-emphasis text-sm">{item.displayValue}</p>
                </div>
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
