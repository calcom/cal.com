"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { ComplianceDocument } from "./compliance-documents";

interface ComplianceDocumentCardProps {
  document: ComplianceDocument;
  hasAccess: boolean;
}

export function ComplianceDocumentCard({ document, hasAccess }: ComplianceDocumentCardProps) {
  const { t } = useLocale();

  const getDownloadUrl = () => {
    if (document.source.type === "url") {
      return document.source.url;
    }
    // For B2 documents, use our API route
    return `/api/compliance/download?id=${document.id}`;
  };

  const handleDownload = () => {
    if (hasAccess) {
      window.open(getDownloadUrl(), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={classNames(
        "border-subtle bg-default flex items-center justify-between rounded-lg border p-4",
        !hasAccess && "opacity-60"
      )}>
      <div className="flex items-center gap-3">
        <div className="bg-subtle flex h-10 w-10 items-center justify-center rounded-lg">
          <Icon name="file-text" className="text-default h-5 w-5" />
        </div>
        <div>
          <p className="text-emphasis text-sm font-medium">{t(document.name)}</p>
          <p className="text-subtle text-sm">{t(document.description)}</p>
        </div>
      </div>

      <div>
        {hasAccess ? (
          <Button color="secondary" onClick={handleDownload} StartIcon="download">
            {t("download")}
          </Button>
        ) : (
          <Tooltip content={t("compliance_upgrade_tooltip")}>
            <span>
              <Button color="secondary" href="/settings/billing" StartIcon="lock">
                {t("upgrade_to_access")}
              </Button>
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
