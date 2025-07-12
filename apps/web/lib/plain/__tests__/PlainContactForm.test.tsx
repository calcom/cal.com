import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import PlainContactForm from "../PlainContactForm";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        contact_support: "Contact Support",
        name: "Name",
        email: "Email",
        subject: "Subject",
        message: "Message",
        message_sent: "Message Sent!",
        contact_form_success_message:
          "Thank you for contacting us. We'll get back to you as soon as possible.",
        send_another_message: "Send Another Message",
        sending: "Sending...",
        send_message: "Send Message",
        attachments_optional: "Attachments (Optional)",
        add_files: "Add Files",
        file_size_limit_exceed: "File size exceeds limit",
        invalid_file_type: "Invalid file type",
        max_files_exceeded: "Maximum files exceeded",
        files_uploaded_successfully: "Files uploaded successfully",
        file_upload_instructions: "Upload images or videos",
      };
      return translations[key] || key;
    },
  }),
}));

const mockUseSession = vi.mocked(useSession);
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PlainContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });
  });

  it("should render contact button when closed", () => {
    render(<PlainContactForm />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should open contact form when button is clicked", () => {
    render(<PlainContactForm />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.getByText("Contact Support")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByText("Attachments (Optional)")).toBeInTheDocument();
  });

  it("should pre-fill form with user data", () => {
    render(<PlainContactForm />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;

    expect(nameInput.value).toBe("Test User");
    expect(emailInput.value).toBe("test@example.com");
  });

  it("should close form when X button is clicked", () => {
    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(screen.queryByText("Contact Support")).not.toBeInTheDocument();
  });

  it("should handle form submission successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Test Subject" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Message Sent!")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/plain-contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test message",
        attachments: [],
      }),
    });
  });

  it("should handle form submission error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Submission failed" }),
    });

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Test Subject" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Submission failed")).toBeInTheDocument();
    });
  });

  it("should show loading state during submission", async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockFetch.mockImplementation(() => new Promise((_resolve) => {}));

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Test Subject" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    expect(screen.getByText("Sending...")).toBeInTheDocument();
    await expect(submitButton).toBeDisabled();
  });

  it("should reset form after successful submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Test Subject" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Message Sent!")).toBeInTheDocument();
    });

    const sendAnotherButton = screen.getByRole("button", { name: /send another message/i });
    fireEvent.click(sendAnotherButton);

    const subjectInput = screen.getByLabelText("Subject") as HTMLInputElement;
    const messageInput = screen.getByLabelText("Message") as HTMLTextAreaElement;

    expect(subjectInput.value).toBe("");
    expect(messageInput.value).toBe("");
  });

  it("should handle missing user session", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;

    expect(nameInput.value).toBe("");
    expect(emailInput.value).toBe("");
  });

  it("should require all form fields", async () => {
    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    await expect(screen.getByLabelText("Name")).toHaveAttribute("required");
    await expect(screen.getByLabelText("Email")).toHaveAttribute("required");
    await expect(screen.getByLabelText("Subject")).toHaveAttribute("required");
    await expect(screen.getByLabelText("Message")).toHaveAttribute("required");
  });
});
