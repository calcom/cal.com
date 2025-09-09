import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { showToast } from "@calcom/ui/components/toast";

import PlainContactForm from "../PlainContactForm";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

const mockUseSession = vi.mocked(useSession);
const mockShowToast = vi.mocked(showToast);
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("PlainContactForm", () => {
  let mockSetIsOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetIsOpen = vi.fn();

    mockUseSession.mockReturnValue({
      data: {
        hasValidLicense: true,
        upId: "test-up-id",
        expires: "2025-12-31T23:59:59.999Z",
        user: {
          id: 123,
          name: "Test User",
          email: "test@example.com",
        },
      },
      status: "authenticated",
      update: vi.fn(),
    } as any);
  });

  it("renders the contact button when closed", () => {
    render(<PlainContactForm open={false} setIsOpen={mockSetIsOpen} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("opens when the launcher button is clicked (calls setIsOpen(true))", () => {
    render(<PlainContactForm open={false} setIsOpen={mockSetIsOpen} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockSetIsOpen).toHaveBeenCalledWith(true);
  });

  it("shows the form when open=true", () => {
    render(<PlainContactForm open={true} setIsOpen={mockSetIsOpen} />);

    expect(screen.getByText("Contact support")).toBeInTheDocument();
    expect(screen.getByLabelText("Describe the issue")).toBeInTheDocument();
    expect(screen.getByText("Attachments (optional)")).toBeInTheDocument();
  });

  it("shows empty form initially", () => {
    render(<PlainContactForm open={true} setIsOpen={mockSetIsOpen} />);

    const messageInput = screen.getByLabelText("Describe the issue") as HTMLTextAreaElement;
    expect(messageInput.value).toBe("");
  });

  it("closes when X button is clicked (calls setIsOpen(false))", () => {
    render(<PlainContactForm open={true} setIsOpen={mockSetIsOpen} />);

    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find((button) => button.querySelector('svg use[href="#x"]'));
    expect(closeButton).toBeDefined();

    fireEvent.click(closeButton!);

    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  it("handles form submission successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<PlainContactForm open={true} setIsOpen={mockSetIsOpen} />);

    fireEvent.change(screen.getByLabelText("Describe the issue"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Message Sent")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/support", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Test message",
        attachmentIds: [],
      }),
    });
  });

  it("shows loading state during submission", async () => {
    // never resolves → stays loading
    mockFetch.mockImplementation(() => new Promise((_resolve) => {}));

    render(<PlainContactForm open={true} setIsOpen={mockSetIsOpen} />);

    fireEvent.change(screen.getByLabelText("Describe the issue"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    expect(screen.getByText("Sending")).toBeInTheDocument();
    await expect(submitButton).toBeDisabled();
  });

  it("resets form after successful submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<PlainContactForm open={true} setIsOpen={mockSetIsOpen} />);

    fireEvent.change(screen.getByLabelText("Describe the issue"), {
      target: { value: "Test message" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText("Message Sent")).toBeInTheDocument();
    });

    const sendAnotherButton = screen.getByRole("button", { name: /send another message/i });
    fireEvent.click(sendAnotherButton);

    await waitFor(() => {
      const messageInput = screen.getByLabelText("Describe the issue") as HTMLTextAreaElement;
      expect(messageInput.value).toBe("");
    });
  });

  it("handles missing user session", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as any);

    render(<PlainContactForm open={true} setIsOpen={mockSetIsOpen} />);

    const messageInput = screen.getByLabelText("Describe the issue") as HTMLTextAreaElement;
    expect(messageInput.value).toBe("");
  });

  it("requires message field", async () => {
    render(<PlainContactForm open={true} setIsOpen={mockSetIsOpen} />);

    await expect(screen.getByLabelText("Describe the issue")).toHaveAttribute("required");
  });
});
