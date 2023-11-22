import { FormbricksAPI } from "@formbricks/api";

import type { Feedback } from "@calcom/emails/templates/feedback-email";

enum Rating {
  "Extremely unsatisfied" = 1,
  "Unsatisfied" = 2,
  "Satisfied" = 3,
  "Extremely satisfied" = 4,
}

if (!process.env.FORMBRICKS_HOST_URL || !process.env.FORMBRICKS_ENVIRONMENT_ID)
  throw new Error("Missing FORMBRICKS_HOST_URL or FORMBRICKS_ENVIRONMENT_ID env variable");
const api = new FormbricksAPI({
  apiHost: process.env.FORMBRICKS_HOST_URL,
  environmentId: process.env.FORMBRICKS_ENVIRONMENT_ID,
});

export const sendFeedbackFormbricks = async (feedback: Feedback) => {
  if (process.env.FORMBRICKS_FEEDBACK_SURVEY_ID) {
    await api.client.response.create({
      surveyId: process.env.FORMBRICKS_FEEDBACK_SURVEY_ID,
      userId: `${feedback.username}`,
      finished: true,
      data: {
        "formbricks-share-comments-question": feedback.comment,
        "formbricks-rating-question": Rating[feedback.rating],
      },
    });
  }
};
