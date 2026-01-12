import type { ValidationError } from "class-validator";
import { IsOptional, Validate, validateSync } from "class-validator";

import { WebhookUrlValidator } from "./webhookUrlValidator";

const mockValidateUrlForSSRFSync: jest.Mock = jest.fn();

jest.mock("@calcom/platform-libraries", () => ({
  validateUrlForSSRFSync: (url: string) => mockValidateUrlForSSRFSync(url),
}));

class TestDto {
  @IsOptional()
  @Validate(WebhookUrlValidator)
  url?: string;
}

describe("WebhookUrlValidator", () => {
  const validate = (url?: string): ValidationError[] => {
    const dto = new TestDto();
    dto.url = url;
    return validateSync(dto);
  };

  beforeEach(() => {
    mockValidateUrlForSSRFSync.mockReset();
  });

  it("accepts undefined values (works with @IsOptional)", () => {
    expect(validate(undefined)).toHaveLength(0);
    expect(mockValidateUrlForSSRFSync).not.toHaveBeenCalled();
  });

  it("delegates to validateUrlForSSRFSync", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: true });

    expect(validate("https://example.com/webhook")).toHaveLength(0);
    expect(mockValidateUrlForSSRFSync).toHaveBeenCalledWith("https://example.com/webhook");
  });

  it("rejects invalid URLs", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: false });

    const errors = validate("http://127.0.0.1/internal");
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty("webhookSafeUrl");
  });
});
