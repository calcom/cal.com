import { describe, expect, it } from "vitest";

import { COMPLIANCE_DOCUMENTS, DOCUMENT_CATEGORIES } from "./compliance-documents";
import type { ComplianceDocument } from "./compliance-documents";

describe("DOCUMENT_CATEGORIES", () => {
  it("has DPA category", () => {
    expect(DOCUMENT_CATEGORIES.DPA).toBe("dpa");
  });

  it("has REPORTS category", () => {
    expect(DOCUMENT_CATEGORIES.REPORTS).toBe("reports");
  });

  it("has OTHER category", () => {
    expect(DOCUMENT_CATEGORIES.OTHER).toBe("other");
  });

  it("has exactly 3 categories", () => {
    expect(Object.keys(DOCUMENT_CATEGORIES)).toHaveLength(3);
  });
});

describe("COMPLIANCE_DOCUMENTS", () => {
  it("contains exactly 4 documents", () => {
    expect(COMPLIANCE_DOCUMENTS).toHaveLength(4);
  });

  it("each document has a unique id", () => {
    const ids = COMPLIANCE_DOCUMENTS.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each document has required fields", () => {
    COMPLIANCE_DOCUMENTS.forEach((doc: ComplianceDocument) => {
      expect(doc.id).toBeTruthy();
      expect(doc.name).toBeTruthy();
      expect(doc.description).toBeTruthy();
      expect(doc.source).toBeDefined();
      expect(doc.category).toBeTruthy();
      expect(typeof doc.restricted).toBe("boolean");
    });
  });

  describe("DPA document", () => {
    it("is a URL source and not restricted", () => {
      const dpa = COMPLIANCE_DOCUMENTS.find((doc) => doc.id === "dpa");
      expect(dpa).toBeDefined();
      expect(dpa?.source.type).toBe("url");
      expect(dpa?.category).toBe(DOCUMENT_CATEGORIES.DPA);
      expect(dpa?.restricted).toBe(false);
    });
  });

  describe("SOC2 report", () => {
    it("is a B2 source and restricted", () => {
      const soc2 = COMPLIANCE_DOCUMENTS.find((doc) => doc.id === "soc2-report");
      expect(soc2).toBeDefined();
      expect(soc2?.source.type).toBe("b2");
      expect(soc2?.category).toBe(DOCUMENT_CATEGORIES.REPORTS);
      expect(soc2?.restricted).toBe(true);
    });
  });

  describe("ISO 27001 certification", () => {
    it("is a B2 source and restricted", () => {
      const iso = COMPLIANCE_DOCUMENTS.find((doc) => doc.id === "iso27001-cert");
      expect(iso).toBeDefined();
      expect(iso?.source.type).toBe("b2");
      expect(iso?.category).toBe(DOCUMENT_CATEGORIES.REPORTS);
      expect(iso?.restricted).toBe(true);
    });
  });

  describe("Pentest report", () => {
    it("is a B2 source and restricted", () => {
      const pentest = COMPLIANCE_DOCUMENTS.find((doc) => doc.id === "pentest-report");
      expect(pentest).toBeDefined();
      expect(pentest?.source.type).toBe("b2");
      expect(pentest?.category).toBe(DOCUMENT_CATEGORIES.OTHER);
      expect(pentest?.restricted).toBe(true);
    });
  });

  it("only DPA is unrestricted", () => {
    const unrestricted = COMPLIANCE_DOCUMENTS.filter((doc) => !doc.restricted);
    expect(unrestricted).toHaveLength(1);
    expect(unrestricted[0].id).toBe("dpa");
  });

  it("all categories are valid", () => {
    const validCategories = Object.values(DOCUMENT_CATEGORIES);
    COMPLIANCE_DOCUMENTS.forEach((doc) => {
      expect(validCategories).toContain(doc.category);
    });
  });
});
