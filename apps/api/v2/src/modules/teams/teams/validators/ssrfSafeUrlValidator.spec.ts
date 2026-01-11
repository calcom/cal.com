import type { ValidationError } from "class-validator";
import { IsOptional, Validate, validateSync } from "class-validator";

import { SSRFSafeUrlValidator } from "./ssrfSafeUrlValidator";

const mockValidateUrlForSSRFSync: jest.Mock = jest.fn();

// Mock with minimal logic - actual validation tested in packages/lib
jest.mock("@calcom/platform-libraries", () => ({
  validateUrlForSSRFSync: (url: string) => mockValidateUrlForSSRFSync(url),
}));

class TestDto {
  @IsOptional()
  @Validate(SSRFSafeUrlValidator)
  url?: string;
}

describe("SSRFSafeUrlValidator", () => {
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

  it("validates empty strings (does not skip validation)", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: false });

    const errors = validate("");
    expect(errors).toHaveLength(1);
    expect(mockValidateUrlForSSRFSync).toHaveBeenCalledWith("");
  });

  it("delegates to validateUrlForSSRFSync and accepts valid URLs", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: true });

    expect(validate("https://example.com/logo.png")).toHaveLength(0);
    expect(mockValidateUrlForSSRFSync).toHaveBeenCalledWith("https://example.com/logo.png");
  });

  it("delegates to validateUrlForSSRFSync and rejects invalid URLs", () => {
    mockValidateUrlForSSRFSync.mockReturnValue({ isValid: false });

    const errors = validate("blocked-url");
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty("ssrfSafeUrl");
    expect(mockValidateUrlForSSRFSync).toHaveBeenCalledWith("blocked-url");
  });
});
