import { describe, expect, it } from "vitest";
import { UserFeaturesDtoSchema } from "./UserFeaturesDto";

describe("UserFeaturesDtoSchema", () => {
  const validUserFeature = {
    userId: 42,
    featureId: "feature-slug",
    enabled: true,
    assignedBy: "admin@example.com",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  it("parses a valid user feature", () => {
    const result = UserFeaturesDtoSchema.safeParse(validUserFeature);
    expect(result.success).toBe(true);
  });

  it("coerces date string to Date object", () => {
    const result = UserFeaturesDtoSchema.parse(validUserFeature);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects missing userId", () => {
    const { userId: _, ...noUserId } = validUserFeature;
    const result = UserFeaturesDtoSchema.safeParse(noUserId);
    expect(result.success).toBe(false);
  });

  it("rejects missing featureId", () => {
    const { featureId: _, ...noFeatureId } = validUserFeature;
    const result = UserFeaturesDtoSchema.safeParse(noFeatureId);
    expect(result.success).toBe(false);
  });

  it("rejects missing enabled", () => {
    const { enabled: _, ...noEnabled } = validUserFeature;
    const result = UserFeaturesDtoSchema.safeParse(noEnabled);
    expect(result.success).toBe(false);
  });

  it("rejects missing assignedBy", () => {
    const { assignedBy: _, ...noAssignedBy } = validUserFeature;
    const result = UserFeaturesDtoSchema.safeParse(noAssignedBy);
    expect(result.success).toBe(false);
  });

  it("rejects missing updatedAt", () => {
    const { updatedAt: _, ...noUpdatedAt } = validUserFeature;
    const result = UserFeaturesDtoSchema.safeParse(noUpdatedAt);
    expect(result.success).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(UserFeaturesDtoSchema.safeParse({ ...validUserFeature, userId: "not-a-number" }).success).toBe(
      false
    );
    expect(UserFeaturesDtoSchema.safeParse({ ...validUserFeature, enabled: "yes" }).success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = UserFeaturesDtoSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
