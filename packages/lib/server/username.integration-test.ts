import "@calcom/testing/lib/__mocks__/prisma";
import { prisma } from "@calcom/prisma";
import { MembershipRole, RedirectType } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import {
  generateUsernameSuggestion,
  isUsernameReservedDueToMigration,
  usernameCheck,
  usernameCheckForSignup,
} from "./username";

describe("username.ts integration tests", () => {
  describe("usernameCheck", () => {
    it("returns available true for a username that does not exist in global namespace", async () => {
      const result = await usernameCheck(`avail-${Date.now()}`);
      expect(result.available).toBe(true);
    });

    it("returns available false when username is taken in global namespace", async () => {
      const takenName = `taken-${Date.now()}`;
      await prisma.user.create({
        data: { email: `${takenName}@test.com`, username: takenName },
      });

      const result = await usernameCheck(takenName);
      expect(result.available).toBe(false);
      expect(result.suggestedUsername).toBeTruthy();
    });

    it("scopes availability check to organization context", async () => {
      const orgSlug = `org-check-${Date.now()}`;
      const org = await prisma.team.create({
        data: { name: "Test Org", slug: orgSlug, isOrganization: true },
      });

      const sharedName = `orguser-${Date.now()}`;
      const orgUser = await prisma.user.create({
        data: { email: `${sharedName}@test.com`, username: sharedName, organizationId: org.id },
      });

      await prisma.membership.create({
        data: { userId: orgUser.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
      });

      // Username should be taken within the org
      const orgResult = await usernameCheck(sharedName, orgSlug);
      expect(orgResult.available).toBe(false);

      // Same username should be available in global namespace (different scope)
      const globalResult = await usernameCheck(sharedName);
      expect(globalResult.available).toBe(true);
    });

    it("throws when organization slug is not found", async () => {
      await expect(usernameCheck("anyuser", `nonexistent-org-${Date.now()}`)).rejects.toThrow();
    });
  });

  describe("usernameCheckForSignup", () => {
    it("returns available true for a new user email", async () => {
      const result = await usernameCheckForSignup({
        username: `newuser-${Date.now()}`,
        email: `newuser-${Date.now()}@test.com`,
      });
      expect(result.available).toBe(true);
      expect(result.suggestedUsername).toBe("");
    });

    it("returns available true when invited user (no password) claims their own username", async () => {
      const username = `claimer-${Date.now()}`;
      const email = `${username}@test.com`;
      await prisma.user.create({
        data: { email, username },
      });

      const result = await usernameCheckForSignup({ username, email });
      expect(result.available).toBe(true);
      expect(result.emailRegistered).toBe(false);
    });

    it("returns available false with emailRegistered when fully registered user re-signs up with same username", async () => {
      const username = `registered-${Date.now()}`;
      const email = `${username}@test.com`;
      await prisma.user.create({
        data: { email, username, password: { create: { hash: "hashed-password" } } },
      });

      const result = await usernameCheckForSignup({ username, email });
      expect(result.available).toBe(false);
      expect(result.emailRegistered).toBe(true);
    });

    it("returns available false with emailRegistered when fully registered user re-signs up with different username", async () => {
      const email = `reregistered-${Date.now()}@test.com`;
      await prisma.user.create({
        data: {
          email,
          username: `original-${Date.now()}`,
          password: { create: { hash: "hashed-password" } },
        },
      });

      const result = await usernameCheckForSignup({
        username: `different-${Date.now()}`,
        email,
      });
      expect(result.available).toBe(false);
      expect(result.emailRegistered).toBe(true);
    });

    it("returns available false when invited user (no password) tries a different username", async () => {
      const email = `existing-${Date.now()}@test.com`;
      await prisma.user.create({
        data: { email, username: `existing-${Date.now()}` },
      });

      const result = await usernameCheckForSignup({
        username: `different-${Date.now()}`,
        email,
      });
      expect(result.available).toBe(false);
      expect(result.emailRegistered).toBe(false);
      expect(result.suggestedUsername).toBeTruthy();
    });

    it("returns available true when user is a member of an organization", async () => {
      const org = await prisma.team.create({
        data: { name: "Signup Org", slug: `org-signup-${Date.now()}`, isOrganization: true },
      });

      const email = `orgmember-${Date.now()}@test.com`;
      const username = `orgmember-${Date.now()}`;
      const user = await prisma.user.create({
        data: { email, username },
      });

      await prisma.membership.create({
        data: { userId: user.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
      });

      const result = await usernameCheckForSignup({ username, email });
      expect(result.available).toBe(true);
    });
  });

  describe("isUsernameReservedDueToMigration", () => {
    it("returns true when username has a tempOrgRedirect entry", async () => {
      const reservedName = `reserved-${Date.now()}`;
      await prisma.tempOrgRedirect.create({
        data: {
          from: reservedName,
          fromOrgId: 0,
          type: RedirectType.User,
          toUrl: `https://example.com/${reservedName}`,
        },
      });

      const result = await isUsernameReservedDueToMigration(reservedName);
      expect(result).toBe(true);
    });

    it("returns false when username has no tempOrgRedirect entry", async () => {
      const result = await isUsernameReservedDueToMigration(`notreserved-${Date.now()}`);
      expect(result).toBe(false);
    });
  });

  describe("generateUsernameSuggestion", () => {
    it("generates a suggestion that avoids existing usernames", async () => {
      const base = `suggest-${Date.now()}`;
      const existing = [`${base}001`, `${base}002`];

      const suggestion = await generateUsernameSuggestion(existing, base);
      expect(suggestion).toMatch(new RegExp(`^${base}\\d+$`));
      expect(existing).not.toContain(suggestion);
    });
  });
});
