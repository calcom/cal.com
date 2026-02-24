import { describe, expect, it } from "vitest";
import { TeamFeaturesDtoSchema } from "./TeamFeaturesDto";

describe("TeamFeaturesDtoSchema", () => {
  const validTeamFeature = {
    teamId: 1,
    featureId: "feature-slug",
    enabled: true,
    assignedBy: "admin@example.com",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  it("parses a valid team feature", () => {
    const result = TeamFeaturesDtoSchema.safeParse(validTeamFeature);
    expect(result.success).toBe(true);
  });

  it("coerces date string to Date object", () => {
    const result = TeamFeaturesDtoSchema.parse(validTeamFeature);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects missing teamId", () => {
    const { teamId: _, ...noTeamId } = validTeamFeature;
    const result = TeamFeaturesDtoSchema.safeParse(noTeamId);
    expect(result.success).toBe(false);
  });

  it("rejects missing featureId", () => {
    const { featureId: _, ...noFeatureId } = validTeamFeature;
    const result = TeamFeaturesDtoSchema.safeParse(noFeatureId);
    expect(result.success).toBe(false);
  });

  it("rejects missing enabled", () => {
    const { enabled: _, ...noEnabled } = validTeamFeature;
    const result = TeamFeaturesDtoSchema.safeParse(noEnabled);
    expect(result.success).toBe(false);
  });

  it("rejects missing assignedBy", () => {
    const { assignedBy: _, ...noAssignedBy } = validTeamFeature;
    const result = TeamFeaturesDtoSchema.safeParse(noAssignedBy);
    expect(result.success).toBe(false);
  });

  it("rejects missing updatedAt", () => {
    const { updatedAt: _, ...noUpdatedAt } = validTeamFeature;
    const result = TeamFeaturesDtoSchema.safeParse(noUpdatedAt);
    expect(result.success).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(TeamFeaturesDtoSchema.safeParse({ ...validTeamFeature, teamId: "not-a-number" }).success).toBe(
      false
    );
    expect(TeamFeaturesDtoSchema.safeParse({ ...validTeamFeature, enabled: "yes" }).success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = TeamFeaturesDtoSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
