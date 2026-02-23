export const DOCUMENT_CATEGORIES = {
  DPA: "dpa",
  REPORTS: "reports",
  OTHER: "other",
} as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[keyof typeof DOCUMENT_CATEGORIES];

export type DocumentSource = { type: "url"; url: string } | { type: "b2"; fileName: string }; // fileName is the path in B2 bucket

export interface ComplianceDocument {
  id: string;
  name: string; // Translation key
  description: string; // Translation key
  source: DocumentSource;
  category: DocumentCategory;
  restricted: boolean; // true = Organizations/Enterprise only
}

export const COMPLIANCE_DOCUMENTS: ComplianceDocument[] = [
  // DPA Section - External URL
  {
    id: "dpa",
    name: "data_protection_agreement",
    description: "dpa_description",
    source: { type: "url", url: "https://go.cal.com/dpa" },
    category: DOCUMENT_CATEGORIES.DPA,
    restricted: false,
  },
  // Reports Section - B2 Storage
  {
    id: "soc2-report",
    name: "soc2_report",
    description: "soc2_report_description",
    source: { type: "b2", fileName: "SOC2.pdf" },
    category: DOCUMENT_CATEGORIES.REPORTS,
    restricted: true,
  },
  {
    id: "iso27001-cert",
    name: "iso27001_certification",
    description: "iso27001_description",
    source: { type: "b2", fileName: "ISO27001-2022.pdf" },
    category: DOCUMENT_CATEGORIES.REPORTS,
    restricted: true,
  },
  // Other Documents - B2 Storage
  {
    id: "pentest-report",
    name: "pentest_report",
    description: "pentest_report_description",
    source: { type: "b2", fileName: "pentest.pdf" },
    category: DOCUMENT_CATEGORIES.OTHER,
    restricted: true,
  },
];
