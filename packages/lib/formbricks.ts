import { FormbricksAPI } from "@formbricks/api";

import type { Feedback } from "@calcom/emails/templates/feedback-email";

enum Rating {
  "Extremely unsatisfied" = 1,
  "Unsatisfied" = 2,
  "Satisfied" = 3,
  "Extremely satisfied" = 4,
}

if (!process.env.FORMBRICKS) throw new Error("Missing NEXT_PUBLIC_FORMBRICKS env variable");
const [apiHost, environmentId] = process.env.FORMBRICKS.split("+");
const api = new FormbricksAPI({
  apiHost,
  environmentId,
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
