"use client";

import { useSession } from "next-auth/react";

import { useLocale } from "@calcom/i18n/useLocale";
import { Card, CardFrame, CardFrameHeader, CardFrameTitle, CardPanel } from "@coss/ui/components/card";

import { ComplianceDocumentCard } from "./compliance/ComplianceDocumentCard";
import { COMPLIANCE_DOCUMENTS, DOCUMENT_CATEGORIES } from "./compliance/compliance-documents";

const ComplianceView = () => {
  const { t } = useLocale();
  const session = useSession();

  // User has access to restricted documents if they're part of an organization
  const hasRestrictedAccess = !!session.data?.user?.org?.id;
  const isAccessLoading = session.status === "loading";

  const documentSections = [
    {
      documents: COMPLIANCE_DOCUMENTS.filter((doc) => doc.category === DOCUMENT_CATEGORIES.DPA),
      title: t("data_privacy"),
    },
    {
      documents: COMPLIANCE_DOCUMENTS.filter((doc) => doc.category === DOCUMENT_CATEGORIES.REPORTS),
      title: t("compliance_reports"),
    },
    {
      documents: COMPLIANCE_DOCUMENTS.filter((doc) => doc.category === DOCUMENT_CATEGORIES.OTHER),
      title: t("other_documents"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {documentSections.map((section) => (
        <CardFrame key={section.title}>
          <CardFrameHeader>
            <CardFrameTitle>{section.title}</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel className="p-0">
              {section.documents.map((doc) => (
                <ComplianceDocumentCard
                  key={doc.id}
                  document={doc}
                  hasAccess={!doc.restricted || hasRestrictedAccess}
                  loading={doc.restricted && isAccessLoading}
                />
              ))}
            </CardPanel>
          </Card>
        </CardFrame>
      ))}
    </div>
  );
};

export default ComplianceView;
