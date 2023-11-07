import { FormbricksAPI } from "@formbricks/api";

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

export const sendFeedbackFormbricks = async (rating: string, comment: string) => {
  if (process.env.FORMBRICKS_FEEDBACK_SURVEY_ID) {
    await api.client.response.create({
      surveyId: process.env.FORMBRICKS_FEEDBACK_SURVEY_ID,
      personId: null,
      finished: true,
      data: {
        "formbricks-share-comments-question": comment,
        "formbricks-rating-question": Rating[rating],
      },
    });
  }
};
