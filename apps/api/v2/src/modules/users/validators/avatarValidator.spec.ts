import { IsOptional, Validate, validateSync } from "class-validator";
import { AvatarValidator } from "./avatarValidator";

// Mock DTO for testing the validator
class MockAvatarDto {
  @IsOptional()
  @Validate(AvatarValidator)
  avatar?: string;
}

// Factory function to create DTOs with avatar
const createAvatarDto = (avatar?: string): MockAvatarDto => {
  const dto = new MockAvatarDto();
  dto.avatar = avatar;
  return dto;
};

describe("AvatarValidator", () => {
  describe("when value is undefined", () => {
    it("accepts undefined values", () => {
      const dto = createAvatarDto(undefined);
      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("when value is a URL", () => {
    it("rejects HTTP URLs (HTTPS only for security)", () => {
      const dto = createAvatarDto("http://example.com/avatar.jpg");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });

    it("accepts valid HTTPS URLs", () => {
      const dto = createAvatarDto("https://avatars.githubusercontent.com/u/583231?v=4");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it("accepts URLs with query parameters", () => {
      const dto = createAvatarDto("https://example.com/avatar.jpg?size=256&format=png");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it("accepts URLs with special characters in path", () => {
      const dto = createAvatarDto("https://cdn.example.com/users/john-doe/avatar_2025.jpg");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects URLs without protocol", () => {
      const dto = createAvatarDto("example.com/avatar.jpg");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });

    it("rejects FTP protocol for security", () => {
      const dto = createAvatarDto("ftp://example.com/avatar.jpg");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });

    it("rejects file protocol for security", () => {
      const dto = createAvatarDto("file:///path/to/avatar.jpg");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });

    it("rejects javascript protocol to prevent XSS", () => {
      const dto = createAvatarDto("javascript:alert('XSS')");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });
  });

  describe("when value is base64 encoded image", () => {
    it("accepts valid PNG base64", () => {
      const dto = createAvatarDto(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      );
      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it("accepts valid JPEG base64", () => {
      const dto = createAvatarDto("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it("accepts valid GIF base64", () => {
      const dto = createAvatarDto(
        "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
      );
      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it("accepts valid WEBP base64", () => {
      const dto = createAvatarDto(
        "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA="
      );
      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects base64 with non-image MIME type", () => {
      const dto = createAvatarDto("data:text/plain;base64,SGVsbG8gV29ybGQ=");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });

    it("rejects malformed base64 data URL", () => {
      const dto = createAvatarDto("data:image/png;base64,INVALID_BASE64_@#$%");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });

    it("rejects base64 with application/json MIME type", () => {
      const dto = createAvatarDto("data:application/json;base64,eyJmb28iOiJiYXIifQ==");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });
  });

  describe("when value is invalid", () => {
    it("rejects plain text strings", () => {
      const dto = createAvatarDto("not a url or base64");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });

    it("rejects empty strings (use null to reset avatar)", () => {
      const dto = createAvatarDto("");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });

    it("rejects whitespace-only strings", () => {
      const dto = createAvatarDto("   ");
      const errors = validateSync(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty("avatarValidator");
    });
  });
});
