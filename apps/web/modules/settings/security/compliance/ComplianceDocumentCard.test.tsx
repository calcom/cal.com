import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComplianceDocument } from "./compliance-documents";
import { DOCUMENT_CATEGORIES } from "./compliance-documents";

vi.mock("@coss/ui/icons", () => ({
  FileTextIcon: (props: Record<string, unknown>) => <div data-testid="file-text-icon" {...props} />,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({
    children,
    onClick,
    href,
    StartIcon,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    href?: string;
    StartIcon?: string;
  }) => (
    <button data-testid={`button-${StartIcon}`} onClick={onClick} data-href={href} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div data-testid="tooltip" data-content={content}>
      {children}
    </div>
  ),
}));

vi.mock("@calcom/ui/classNames", () => ({
  default: (...args: string[]) => args.filter(Boolean).join(" "),
}));

describe("ComplianceDocumentCard", async () => {
  const { ComplianceDocumentCard } = await import("./ComplianceDocumentCard");
  const urlDocument: ComplianceDocument = {
    id: "dpa",
    name: "data_protection_agreement",
    description: "dpa_description",
    source: { type: "url", url: "https://go.cal.com/dpa" },
    category: DOCUMENT_CATEGORIES.DPA,
    restricted: false,
  };

  const b2Document: ComplianceDocument = {
    id: "soc2-report",
    name: "soc2_report",
    description: "soc2_report_description",
    source: { type: "b2", fileName: "SOC2.pdf" },
    category: DOCUMENT_CATEGORIES.REPORTS,
    restricted: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render document name and description", () => {
    render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);

    expect(screen.getByText("data_protection_agreement")).toBeInTheDocument();
    expect(screen.getByText("dpa_description")).toBeInTheDocument();
  });

  it("should render download button when user has access", () => {
    render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);

    const downloadBtn = screen.getByTestId("button-download");
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toHaveTextContent("download");
  });

  it("should render upgrade button when user does not have access", () => {
    render(<ComplianceDocumentCard document={b2Document} hasAccess={false} />);

    const lockBtn = screen.getByTestId("button-lock");
    expect(lockBtn).toBeInTheDocument();
    expect(lockBtn).toHaveTextContent("upgrade_to_access");
  });

  it("should apply reduced opacity when user does not have access", () => {
    const { container } = render(<ComplianceDocumentCard document={b2Document} hasAccess={false} />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("opacity-60");
  });

  it("should not apply reduced opacity when user has access", () => {
    const { container } = render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain("opacity-60");
  });

  it("should show tooltip with upgrade message when no access", () => {
    render(<ComplianceDocumentCard document={b2Document} hasAccess={false} />);

    const tooltip = screen.getByTestId("tooltip");
    expect(tooltip).toHaveAttribute("data-content", "compliance_upgrade_tooltip");
  });

  it("should render FileTextIcon", () => {
    render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);
    expect(screen.getByTestId("file-text-icon")).toBeInTheDocument();
  });

  it("should point upgrade button to billing page", () => {
    render(<ComplianceDocumentCard document={b2Document} hasAccess={false} />);

    const lockBtn = screen.getByTestId("button-lock");
    expect(lockBtn).toHaveAttribute("data-href", "/settings/billing");
  });
});
