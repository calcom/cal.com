import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "./Dialog";

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams() {
    return new URLSearchParams();
  },
}));

vi.mock("next/navigation", () => ({
  usePathname() {
    return "";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  useRouter() {
    return {
      push: vi.fn(),
      beforePopState: vi.fn(() => null),
      prefetch: vi.fn(() => null),
    };
  },
}));

const title = "Dialog Header";
const subtitle = "Dialog Subtitle";

const DialogComponent = (props: {
  open: boolean;
  title?: string;
  subtitle?: string;
  type?: "creation" | "confirmation";
  showDivider?: boolean;
  color?: "primary" | "secondary" | "minimal" | "destructive";
}) => {
  return (
    <Dialog open={props.open}>
      <DialogContent type={props.type}>
        <div className="flex flex-row justify-center align-middle ">
          <DialogHeader title={props.title} subtitle={props.subtitle} />
          <p>Dialog Content</p>
          <DialogFooter showDivider={props.showDivider}>
            <DialogClose color={props.color} />
            <p>Dialog Footer</p>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

describe("Tests for Dialog component", () => {
  test("Should render Dialog with header", () => {
    render(<DialogComponent open title={title} />);

    expect(screen.queryByText("Dialog Header")).toBeInTheDocument();
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByText("Dialog Footer")).toBeInTheDocument();
  });

  test("Should render Dialog without header", () => {
    render(<DialogComponent open />);

    expect(screen.queryByTestId("dialog-title")).toBeNull();
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByText("Dialog Footer")).toBeInTheDocument();
  });

  test("Should render Dialog with header and subtitle", () => {
    render(<DialogComponent open title={title} subtitle={subtitle} />);

    expect(screen.queryByText("Dialog Header")).toBeInTheDocument();
    expect(screen.queryByText("Dialog Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByText("Dialog Footer")).toBeInTheDocument();
  });

  test("Should render Dialog with default type creation", () => {
    render(<DialogComponent open />);

    expect(screen.getByTestId("dialog-creation")).toBeInTheDocument();
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByText("Dialog Footer")).toBeInTheDocument();
  });

  test("Should render Dialog with type creation", () => {
    render(<DialogComponent open type="creation" />);

    expect(screen.getByTestId("dialog-creation")).toBeInTheDocument();
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByText("Dialog Footer")).toBeInTheDocument();
  });

  test("Should render Dialog with type confirmation", () => {
    render(<DialogComponent open type="confirmation" />);

    expect(screen.getByTestId("dialog-confirmation")).toBeInTheDocument();
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByText("Dialog Footer")).toBeInTheDocument();
  });

  test("Should open Dialog", async () => {
    const { rerender } = render(<DialogComponent open={false} />);

    expect(screen.queryByText("Dialog Content")).not.toBeInTheDocument();
    expect(screen.queryByText("Dialog Footer")).not.toBeInTheDocument();

    rerender(<DialogComponent open />);

    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByText("Dialog Footer")).toBeInTheDocument();
  });

  test("Should close Dialog", async () => {
    const { rerender } = render(<DialogComponent open />);

    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByText("Dialog Footer")).toBeInTheDocument();

    rerender(<DialogComponent open={false} />);

    expect(screen.queryByText("Dialog Content")).not.toBeInTheDocument();
    expect(screen.queryByText("Dialog Footer")).not.toBeInTheDocument();
  });

  test("Should use color from props in CloseDialog", async () => {
    render(<DialogComponent open color="destructive" />);
    const closeBtn = screen.getByText("Close");
    expect(closeBtn.classList.toString()).toContain("hover:text-red-700");
  });

  test("Should show divider with showDivider", async () => {
    render(<DialogComponent open showDivider />);

    expect(screen.getByTestId("divider")).toBeInTheDocument();
  });
});
