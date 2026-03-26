"use client";

import { useSession } from "next-auth/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

import { ComplianceDocumentCard } from "./compliance/ComplianceDocumentCard";
import { COMPLIANCE_DOCUMENTS, DOCUMENT_CATEGORIES } from "./compliance/compliance-documents";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="border-subtle border border-t-0 px-4 py-8 sm:px-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="mt-4 h-8 w-full" />
        <SkeletonText className="mt-4 h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const ComplianceView = () => {
  const { t } = useLocale();
  const session = useSession();

  if (session.status === "loading") return <SkeletonLoader />;

  // User has access to restricted documents if they're part of an organization
  const hasRestrictedAccess = !!session.data?.user?.org?.id;

  const dpaDocuments = COMPLIANCE_DOCUMENTS.filter((doc) => doc.category === DOCUMENT_CATEGORIES.DPA);
  const reportDocuments = COMPLIANCE_DOCUMENTS.filter((doc) => doc.category === DOCUMENT_CATEGORIES.REPORTS);
  const otherDocuments = COMPLIANCE_DOCUMENTS.filter((doc) => doc.category === DOCUMENT_CATEGORIES.OTHER);

  return (
    <div className="border-subtle space-y-8 rounded-b-xl border border-t-0 px-4 py-6 sm:px-6">
      {/* DPA Section */}
      <section>
        <h2 className="text-emphasis mb-4 text-base font-semibold">{t("data_privacy")}</h2>
        <div className="space-y-3">
          {dpaDocuments.map((doc) => (
            <ComplianceDocumentCard
              key={doc.id}
              document={doc}
              hasAccess={!doc.restricted || hasRestrictedAccess}
            />
          ))}
        </div>
      </section>

      {/* Reports Section */}
      <section>
        <h2 className="text-emphasis mb-4 text-base font-semibold">{t("compliance_reports")}</h2>
        <div className="space-y-3">
          {reportDocuments.map((doc) => (
            <ComplianceDocumentCard
              key={doc.id}
              document={doc}
              hasAccess={!doc.restricted || hasRestrictedAccess}
            />
          ))}
        </div>
      </section>

      {/* Other Documents Section */}
      <section>
        <h2 className="text-emphasis mb-4 text-base font-semibold">{t("other_documents")}</h2>
        <div className="space-y-3">
          {otherDocuments.map((doc) => (
            <ComplianceDocumentCard
              key={doc.id}
              document={doc}
              hasAccess={!doc.restricted || hasRestrictedAccess}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default ComplianceView;
