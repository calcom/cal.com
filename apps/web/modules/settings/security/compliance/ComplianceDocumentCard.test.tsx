import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComplianceDocument } from "./compliance-documents";
import { DOCUMENT_CATEGORIES } from "./compliance-documents";

vi.mock("@coss/ui/icons", () => ({
  DownloadIcon: () => <div data-testid="download-icon" />,
  FileTextIcon: (props: Record<string, unknown>) => <div data-testid="file-text-icon" {...props} />,
  LockIcon: () => <div data-testid="lock-icon" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@coss/ui/components/button", () => ({
  Button: ({
    children,
    onClick,
    render,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    render?: React.ReactElement;
  }) => {
    if (render) {
      return React.cloneElement(render, { ...rest }, children);
    }

    return (
      <button onClick={onClick} {...rest}>
        {children}
      </button>
    );
  },
}));

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: (props: Record<string, unknown>) => <div data-testid="action-skeleton" {...props} />,
}));

vi.mock("@coss/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">
      {children}
    </div>
  ),
  TooltipPopup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-popup">{children}</div>
  ),
  TooltipTrigger: ({ render }: { render: React.ReactElement }) => render,
}));

vi.mock("@coss/ui/components/empty", () => ({
  EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@coss/ui/shared/list-item", () => ({
  ListItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ListItemTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("ComplianceDocumentCard", async () => {
  const { ComplianceDocumentCard } = await import("./ComplianceDocumentCard");
  const mockOpen = vi.fn();
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
    vi.stubGlobal("open", mockOpen);
  });

  it("should render document name and description", () => {
    render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);

    expect(screen.getByText("data_protection_agreement")).toBeInTheDocument();
    expect(screen.getByText("dpa_description")).toBeInTheDocument();
  });

  it("should render download button when user has access", () => {
    render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);

    const downloadBtn = screen.getByRole("button", { name: "download" });
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toHaveTextContent("download");
  });

  it("should render upgrade button when user does not have access", () => {
    render(<ComplianceDocumentCard document={b2Document} hasAccess={false} />);

    const lockBtn = screen.getByRole("link", { name: "upgrade_to_access" });
    expect(lockBtn).toBeInTheDocument();
    expect(lockBtn).toHaveTextContent("upgrade_to_access");
  });

  it("should show tooltip with upgrade message when no access", () => {
    render(<ComplianceDocumentCard document={b2Document} hasAccess={false} />);

    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-popup")).toHaveTextContent("compliance_upgrade_tooltip");
  });

  it("should render FileTextIcon", () => {
    render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);
    expect(screen.getByTestId("file-text-icon")).toBeInTheDocument();
  });

  it("should render DownloadIcon when user has access", () => {
    render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);

    expect(screen.getByTestId("download-icon")).toBeInTheDocument();
  });

  it("should render LockIcon when user does not have access", () => {
    render(<ComplianceDocumentCard document={b2Document} hasAccess={false} />);

    expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
  });

  it("should render action skeleton while loading", () => {
    render(<ComplianceDocumentCard document={b2Document} hasAccess={false} loading={true} />);

    expect(screen.getByTestId("action-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "upgrade_to_access" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "download" })).not.toBeInTheDocument();
  });

  it("should open document in a new tab when user has access", () => {
    render(<ComplianceDocumentCard document={urlDocument} hasAccess={true} />);

    fireEvent.click(screen.getByRole("button", { name: "download" }));
    expect(mockOpen).toHaveBeenCalledWith("https://go.cal.com/dpa", "_blank", "noopener,noreferrer");
  });

  it("should point upgrade button to billing page", () => {
    render(<ComplianceDocumentCard document={b2Document} hasAccess={false} />);

    const lockBtn = screen.getByRole("link", { name: "upgrade_to_access" });
    expect(lockBtn).toHaveAttribute("href", "/settings/billing");
  });
});
