import { NextApiRequest, NextApiResponse } from "next";

import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import notEmpty from "./utils/notEmpty";
import { wordlist } from "./utils/wordlist/wordlist";

export type RequestWithUsernameStatus = NextApiRequest & {
  usernameStatus: {
    /**
     * ```text
     * 200: Username is available
     * 402: Pro username, must be purchased
     * 418: A user exists with that username
     * ```
     */
    statusCode: 200 | 402 | 418;
    requestedUserName: string;
    json: {
      available: boolean;
      premium: boolean;
      message?: string;
      suggestion?: string;
    };
  };
};

type CustomNextApiHandler<T = any> = (
  req: RequestWithUsernameStatus,
  res: NextApiResponse<T>
) => void | Promise<void>;

export const isPremiumUserName = (username: string): boolean =>
  username.length <= 4 || Object.prototype.hasOwnProperty.call(wordlist, username);

const usernameHandler =
  (handler: CustomNextApiHandler) =>
  async (req: RequestWithUsernameStatus, res: NextApiResponse): Promise<void> => {
    const username = slugify(req.body.username);

    const generateUsernameSuggestion = async (users: String[], username: String) => {
      const limit = username.length < 2 ? 9999 : 999;
      let rand = 1;
      while (users.includes(username + String(rand).padStart(4 - rand.toString().length, "0"))) {
        rand = Math.ceil(1 + Math.random() * (limit - 1));
      }
      return username + String(rand).padStart(4 - rand.toString().length, "0");
    };

    req.usernameStatus = {
      statusCode: 200,
      requestedUserName: username,
      json: {
        available: true,
        premium: false,
        message: "Username is available",
      },
    };

    if (isPremiumUserName(username)) {
      req.usernameStatus.statusCode = 402;
      req.usernameStatus.json.premium = true;
      req.usernameStatus.json.message = `This is a premium username. Claim it at cal.com/claim/${username}`;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
      },
    });

    if (user) {
      req.usernameStatus.statusCode = 418;
      req.usernameStatus.json.available = false;
      req.usernameStatus.json.message = "A user exists with that username";
    }

    // get list of similar usernames in the db
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: username,
        },
      },
      select: {
        username: true,
      },
    });
    // get a non-premium username suggestion
    req.usernameStatus.json.suggestion = await generateUsernameSuggestion(
      users.map((user) => user.username).filter(notEmpty),
      username
    );

    return handler(req, res);
  };

export default usernameHandler;
