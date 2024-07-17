import mailhog from "mailhog";

import { IS_MAILHOG_ENABLED } from "@calcom/lib/constants";

const unimplemented = () => {
  // throw new Error("Mailhog is not enabled");
  return null;
};

const hasUUID = (query: string) => {
  return /[a-zA-Z0-9]{22}/.test(query) || /[0-9a-f]{8}/.test(query);
};
export const createEmailsFixture = () => {
  if (IS_MAILHOG_ENABLED) {
    const mailhogAPI = mailhog();
    return {
      messages: mailhogAPI.messages.bind(mailhogAPI),
      search: (query: string, kind?: string, start?: number, limit?: number) => {
        if (kind === "from" || kind === "to") {
          if (!hasUUID(query)) {
            throw new Error(
              `You should not use "from" or "to" queries without UUID in emails. Because mailhog maintains all the emails sent through tests, you should be able to uniquely identify the email among those. Found query: ${query}`
            );
          }
        }
        return mailhogAPI.search.bind(mailhogAPI)(query, kind, start, limit);
      },
      deleteMessage: mailhogAPI.deleteMessage.bind(mailhogAPI),
    };
  } else {
    return {
      messages: unimplemented,
      search: unimplemented,
      deleteMessage: unimplemented,
    };
  }
};
