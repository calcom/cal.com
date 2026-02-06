import { BadRequestException } from "@nestjs/common";

// Mock the platform-libraries module
const mockValidateUrlForSSRFSync: jest.Mock = jest.fn();
jest.mock("@calcom/platform-libraries", () => ({
  validateUrlForSSRFSync: (url: string) => mockValidateUrlForSSRFSync(url),
}));

import { validateWebhookUrl, validateWebhookUrlIfChanged } from "./validate-webhook-url";

describe("validateWebhookUrl", () => {
  beforeEach(() => {
    mockValidateUrlForSSRFSync.mockReset();
  });

  it("does not throw when URL is valid", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: true });

    expect(() => validateWebhookUrl("https://example.com/webhook")).not.toThrow();
    expect(mockValidateUrlForSSRFSync).toHaveBeenCalledWith("https://example.com/webhook");
  });

  it("throws BadRequestException when URL is invalid", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: false, error: "Private IP address" });

    expect(() => validateWebhookUrl("https://127.0.0.1/webhook")).toThrow(BadRequestException);
    expect(() => validateWebhookUrl("https://127.0.0.1/webhook")).toThrow(
      "Webhook URL is not allowed: Private IP address"
    );
  });

  it("includes error message from validation result", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: false, error: "Blocked hostname" });

    expect(() => validateWebhookUrl("https://localhost/webhook")).toThrow(
      "Webhook URL is not allowed: Blocked hostname"
    );
  });

  it("handles validation result without error message", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: false });

    expect(() => validateWebhookUrl("invalid-url")).toThrow(
      "Webhook URL is not allowed: undefined"
    );
  });
});

describe("validateWebhookUrlIfChanged", () => {
  beforeEach(() => {
    mockValidateUrlForSSRFSync.mockReset();
  });

  it("validates URL when it is different from existing", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: true });

    validateWebhookUrlIfChanged("https://new.com/webhook", "https://old.com/webhook");

    expect(mockValidateUrlForSSRFSync).toHaveBeenCalledWith("https://new.com/webhook");
  });

  it("throws when new URL is different and invalid", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: false, error: "Only HTTPS URLs are allowed" });

    expect(() =>
      validateWebhookUrlIfChanged("http://new.com/webhook", "https://old.com/webhook")
    ).toThrow(BadRequestException);
  });

  it("does not validate when URL is unchanged", () => {
    validateWebhookUrlIfChanged("https://same.com/webhook", "https://same.com/webhook");

    expect(mockValidateUrlForSSRFSync).not.toHaveBeenCalled();
  });

  it("does not validate when new URL is undefined", () => {
    validateWebhookUrlIfChanged(undefined, "https://existing.com/webhook");

    expect(mockValidateUrlForSSRFSync).not.toHaveBeenCalled();
  });

  it("validates when existing URL is undefined and new URL is provided", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: true });

    validateWebhookUrlIfChanged("https://new.com/webhook", undefined);

    expect(mockValidateUrlForSSRFSync).toHaveBeenCalledWith("https://new.com/webhook");
  });

  it("does not validate when both URLs are undefined", () => {
    validateWebhookUrlIfChanged(undefined, undefined);

    expect(mockValidateUrlForSSRFSync).not.toHaveBeenCalled();
  });
});