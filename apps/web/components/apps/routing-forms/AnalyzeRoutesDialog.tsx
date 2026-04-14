"use client";

import type { AnalyzeRoutesResult } from "@calcom/app-store/routing-forms/lib/analyzeRoutes";
import { useLocale } from "@calcom/i18n/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@calcom/ui/components/dialog";

interface AnalyzeRoutesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  result: AnalyzeRoutesResult;
}

export function AnalyzeRoutesDialog({
  isOpen,
  onOpenChange,
  result,
}: AnalyzeRoutesDialogProps) {
  const { t } = useLocale();

  const { shadowedRoutes, hasIssues } = result;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("shadowed_routes_found")}
        description={
          <>
            {t("form_updated_successfully")} {t("but_some_routes_unreachable")}
          </>
        }
      >
        {hasIssues && (
          <div className="overflow-y-auto mt-4 space-y-3 max-h-72">
            {shadowedRoutes.map((shadowedRoute) => (
              <div
                key={shadowedRoute.routeId}
                className="p-4 rounded-lg border border-subtle bg-subtle"
              >
                <div className="flex gap-2 items-center mb-2">
                  <span className="font-medium text-emphasis">
                    {shadowedRoute.routeName}
                  </span>
                  <Badge variant="red">{t("unreachable")}</Badge>
                </div>
                <p className="mb-2 text-sm text-subtle">
                  {shadowedRoute.reason}
                </p>
                <p className="text-sm text-subtle">
                  {t("move_route_above", {
                    routeName: shadowedRoute.shadowedByRouteName,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}

        <DialogFooter showDivider className="mt-6">
          <DialogClose />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
