import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/i18n/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@coss/ui/components/button", () => ({
  Button: ({ children, onClick, ...rest }: any) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@coss/ui/components/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardFrame: ({ children }: any) => <div>{children}</div>,
  CardFrameFooter: ({ children }: any) => <div>{children}</div>,
  CardPanel: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@coss/ui/components/label", () => ({
  Label: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@coss/ui/icons", () => ({
  TrashIcon: () => <span />,
}));

describe("ProfileDangerZone", async () => {
  const { ProfileDangerZone } = await import("./profile-danger-zone");

  it("should call onDeleteAccount when delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(<ProfileDangerZone onDeleteAccount={onDelete} />);

    await userEvent.click(screen.getByTestId("delete-account"));

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("should render danger zone label and description", () => {
    render(<ProfileDangerZone onDeleteAccount={vi.fn()} />);

    expect(screen.getByText("danger_zone")).toBeInTheDocument();
    expect(screen.getByText("account_deletion_cannot_be_undone")).toBeInTheDocument();
  });
});
