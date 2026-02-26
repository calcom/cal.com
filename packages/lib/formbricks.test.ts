import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockResponseCreate = vi.fn();
const mockPeopleUpdate = vi.fn();

vi.mock("@formbricks/api", () => {
  return {
    FormbricksAPI: class MockFormbricksAPI {
      client = {
        response: { create: (...args: unknown[]) => mockResponseCreate(...args) },
        people: { update: (...args: unknown[]) => mockPeopleUpdate(...args) },
      };
    },
  };
});

vi.mock("@calcom/emails/templates/feedback-email", () => ({}));

import { sendFeedbackFormbricks } from "./formbricks";

describe("sendFeedbackFormbricks", () => {
  beforeEach(() => {
    mockResponseCreate.mockReset();
    mockPeopleUpdate.mockReset();
    mockResponseCreate.mockResolvedValue({});
    mockPeopleUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when NEXT_PUBLIC_FORMBRICKS_HOST_URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_HOST_URL", "");
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID", "env-123");

    await expect(
      sendFeedbackFormbricks(1, {
        rating: "Satisfied",
        comment: "Great",
        email: "user@example.com",
        username: "user1",
      })
    ).rejects.toThrow("Missing FORMBRICKS_HOST_URL or FORMBRICKS_ENVIRONMENT_ID env variable");
  });

  it("throws when NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_HOST_URL", "https://formbricks.example.com");
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID", "");

    await expect(
      sendFeedbackFormbricks(1, {
        rating: "Satisfied",
        comment: "Great",
        email: "user@example.com",
        username: "user1",
      })
    ).rejects.toThrow("Missing FORMBRICKS_HOST_URL or FORMBRICKS_ENVIRONMENT_ID env variable");
  });

  it("does nothing when FORMBRICKS_FEEDBACK_SURVEY_ID is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_HOST_URL", "https://formbricks.example.com");
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID", "env-123");
    vi.stubEnv("FORMBRICKS_FEEDBACK_SURVEY_ID", "");

    await sendFeedbackFormbricks(1, {
      rating: "Satisfied",
      comment: "Great",
      email: "user@example.com",
      username: "user1",
    });

    expect(mockResponseCreate).not.toHaveBeenCalled();
    expect(mockPeopleUpdate).not.toHaveBeenCalled();
  });

  it("throws for invalid rating value", async () => {
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_HOST_URL", "https://formbricks.example.com");
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID", "env-123");
    vi.stubEnv("FORMBRICKS_FEEDBACK_SURVEY_ID", "survey-456");

    await expect(
      sendFeedbackFormbricks(1, {
        rating: "InvalidRating",
        comment: "Great",
        email: "user@example.com",
        username: "user1",
      })
    ).rejects.toThrow("Invalid rating value");
  });

  it("creates response and updates people for valid feedback", async () => {
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_HOST_URL", "https://formbricks.example.com");
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID", "env-123");
    vi.stubEnv("FORMBRICKS_FEEDBACK_SURVEY_ID", "survey-456");

    await sendFeedbackFormbricks(42, {
      rating: "Satisfied",
      comment: "Works well",
      email: "user@test.com",
      username: "testuser",
    });

    expect(mockResponseCreate).toHaveBeenCalledWith({
      surveyId: "survey-456",
      userId: "42",
      finished: true,
      data: {
        "formbricks-share-comments-question": "Works well",
        "formbricks-rating-question": 3,
      },
    });

    expect(mockPeopleUpdate).toHaveBeenCalledWith("42", {
      attributes: {
        email: "user@test.com",
        username: "testuser",
      },
    });
  });

  it("maps 'Extremely unsatisfied' to rating value 1", async () => {
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_HOST_URL", "https://formbricks.example.com");
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID", "env-123");
    vi.stubEnv("FORMBRICKS_FEEDBACK_SURVEY_ID", "survey-456");

    await sendFeedbackFormbricks(1, {
      rating: "Extremely unsatisfied",
      comment: "Bad",
      email: "a@b.com",
      username: "u",
    });

    expect(mockResponseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          "formbricks-rating-question": 1,
        }),
      })
    );
  });

  it("maps 'Extremely satisfied' to rating value 4", async () => {
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_HOST_URL", "https://formbricks.example.com");
    vi.stubEnv("NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID", "env-123");
    vi.stubEnv("FORMBRICKS_FEEDBACK_SURVEY_ID", "survey-456");

    await sendFeedbackFormbricks(1, {
      rating: "Extremely satisfied",
      comment: "Amazing",
      email: "a@b.com",
      username: "u",
    });

    expect(mockResponseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          "formbricks-rating-question": 4,
        }),
      })
    );
  });
});
