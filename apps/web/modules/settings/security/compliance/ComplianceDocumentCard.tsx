"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import { Button } from "@coss/ui/components/button";
import { EmptyMedia } from "@coss/ui/components/empty";
import { Skeleton } from "@coss/ui/components/skeleton";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { DownloadIcon, FileTextIcon, LockIcon } from "@coss/ui/icons";
import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@coss/ui/shared/list-item";
import Link from "next/link";

import type { ComplianceDocument } from "./compliance-documents";

interface ComplianceDocumentCardProps {
  document: ComplianceDocument;
  hasAccess: boolean;
  loading?: boolean;
}

export function ComplianceDocumentCard({ document, hasAccess, loading = false }: ComplianceDocumentCardProps) {
  const { t } = useLocale();

  const getDownloadUrl = () => {
    if (document.source.type === "url") {
      return document.source.url;
    }
    // For B2 documents, use our API route
    return `/api/compliance/download?id=${document.id}`;
  };

  const handleDownload = () => {
    window.open(getDownloadUrl(), "_blank", "noopener,noreferrer");
  };

  return (
    <ListItem>
      <EmptyMedia className="m-0 self-start" variant="icon">
        <FileTextIcon />
      </EmptyMedia>
      <div className="flex max-sm:flex-col flex-1 gap-4">
        <ListItemContent>
          <ListItemHeader>
            <ListItemTitle>{t(document.name)}</ListItemTitle>
            <ListItemDescription>{t(document.description)}</ListItemDescription>
          </ListItemHeader>
        </ListItemContent>
        <ListItemActions>
          {loading ? (
            <Skeleton className="h-9 sm:h-8 w-36 rounded-lg" />
          ) : hasAccess ? (
            <Button onClick={handleDownload} variant="outline">
              <DownloadIcon />
              {t("download")}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span>
                    <Button render={<Link href="/settings/billing" />} variant="outline">
                      <LockIcon />
                      {t("upgrade_to_access")}
                    </Button>
                  </span>
                }
              />
              <TooltipPopup>{t("compliance_upgrade_tooltip")}</TooltipPopup>
            </Tooltip>
          )}
        </ListItemActions>
      </div>
    </ListItem>
  );
}
