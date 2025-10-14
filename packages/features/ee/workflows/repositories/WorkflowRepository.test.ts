// eslint-disable-next-line @typescript-eslint/no-unused-vars
import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect } from "vitest";

import { WorkflowRepository } from "./WorkflowRepository";

describe("WorkflowRepository", () => {
  describe("getVerifiedEmails", () => {
    it("should return the email of the user", async () => {
      prismaMock.secondaryEmail.findMany.mockResolvedValue([]);
      prismaMock.verifiedEmail.findMany.mockResolvedValue([]);

      const emails = await WorkflowRepository.getVerifiedEmails({
        userEmail: "user@example.com",
        userId: 1,
      });
      expect(emails).toEqual(["user@example.com"]);
    });

    it("should return the email of the user and verified secondary emails", async () => {
      prismaMock.verifiedEmail.findMany.mockResolvedValue([]);
      prismaMock.secondaryEmail.findMany.mockResolvedValue([
        {
          id: 101,
          email: "secondary@example.com",
          emailVerified: new Date(),
        },
      ]);

      const emails = await WorkflowRepository.getVerifiedEmails({
        userEmail: "user@example.com",
        userId: 1,
      });
      expect(emails).toEqual(["user@example.com", "secondary@example.com"]);
    });

    it("should return the email of the user and verified secondary emails from the team", async () => {
      prismaMock.verifiedEmail.findMany.mockResolvedValue([]);
      prismaMock.secondaryEmail.findMany.mockResolvedValue([
        {
          id: 101,
          email: "secondary@example.com",
          emailVerified: new Date(),
        },
      ]);

      prismaMock.user.findMany.mockResolvedValue([
        {
          id: 1,
          email: "organizer@example.com",
        },
        {
          id: 2,
          email: "teammember1@example.com",
          secondaryEmails: [],
        },
        {
          id: 3,
          email: "teammember2@example.com",
          secondaryEmails: [
            {
              email: "secondary2@example.com",
              emailVerified: new Date(),
            },
          ],
        },
      ]);

      const emails = await WorkflowRepository.getVerifiedEmails({
        userEmail: "user@example.com",
        userId: 1,
        teamId: 1,
      });
      expect(emails).toEqual([
        "user@example.com",
        "secondary@example.com",
        "teammember1@example.com",
        "teammember2@example.com",
        "secondary2@example.com",
      ]);
    });
  });
});
