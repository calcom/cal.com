import { describe, it, expect, beforeEach } from "vitest";

import { SIGNUP_ERROR_CODES } from "../../constants";
import type { MockResponse } from "./mocks/next.mocks";
import {
  prismaMock,
  createP2002Error,
  createP2002ErrorWithoutTarget,
  createGenericPrismaError,
} from "./mocks/prisma.mocks";
import { createSignupBody, createMockUser } from "./mocks/signup.factories";

import type { SignupBody } from "./mocks/signup.factories";

type CallHandler = (body: SignupBody) => Promise<MockResponse>;

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: test suite contains multiple test cases
export function runP2002TestSuite(
  handlerName: string,
  callHandler: CallHandler,
  setupMocks: () => void
): void {
  describe(`${handlerName} – signup P2002 contract`, () => {
    describe("P2002 Error Handling (non-token flow)", () => {
      beforeEach(setupMocks);

      it("returns 409 when target includes 'email'", async () => {
        prismaMock.user.create.mockRejectedValue(createP2002Error(["email"]));

        const response = await callHandler(createSignupBody());

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
          message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
        });
      });

      it("returns 409 when target includes 'email' among other fields", async () => {
        prismaMock.user.create.mockRejectedValue(createP2002Error(["id", "email", "username"]));

        const response = await callHandler(createSignupBody());

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
          message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
        });
      });

      it("returns 409 when target is 'username' only", async () => {
        prismaMock.user.create.mockRejectedValue(createP2002Error(["username"]));

        const response = await callHandler(createSignupBody());

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
          message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
        });
      });

      it("re-throws when target is empty", async () => {
        const error = createP2002ErrorWithoutTarget();
        prismaMock.user.create.mockRejectedValue(error);

        await expect(callHandler(createSignupBody())).rejects.toThrow(error);
      });

      it("re-throws when target is undefined", async () => {
        const error = createP2002Error([]);
        error.meta = undefined;
        prismaMock.user.create.mockRejectedValue(error);

        await expect(callHandler(createSignupBody())).rejects.toThrow(error);
      });

      it("re-throws non-P2002 Prisma errors", async () => {
        const error = createGenericPrismaError();
        prismaMock.user.create.mockRejectedValue(error);

        await expect(callHandler(createSignupBody())).rejects.toThrow(error);
      });

      it("re-throws generic errors", async () => {
        const error = new Error("Database connection failed");
        prismaMock.user.create.mockRejectedValue(error);

        await expect(callHandler(createSignupBody())).rejects.toThrow(error);
      });
    });

    describe("Successful Creation", () => {
      beforeEach(setupMocks);

      it("returns 201 when user is created (non-token flow)", async () => {
        prismaMock.user.create.mockResolvedValue(createMockUser() as never);

        const response = await callHandler(createSignupBody());

        expect(response.status).toBe(201);
      });

      it("returns 201 when user is created via invite (token flow)", async () => {
        prismaMock.user.findUnique.mockResolvedValue(null as never);
        prismaMock.user.findFirst.mockResolvedValue(null as never);
        prismaMock.user.upsert.mockResolvedValue(createMockUser() as never);

        const response = await callHandler(createSignupBody({ token: "valid-token" }));

        expect(response.status).toBe(201);
      });
    });

    describe("Invite flow - existing user validation", () => {
      beforeEach(setupMocks);

      it("returns 409 when user exists but was not invited to this team", async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: 99, invitedTo: 999 } as never);

        const response = await callHandler(createSignupBody({ token: "valid-token" }));

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
          message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
        });
      });

      it("returns 201 when user exists and was invited to this team", async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: 99, invitedTo: 1 } as never);
        prismaMock.user.findFirst.mockResolvedValue(null as never);
        prismaMock.user.upsert.mockResolvedValue(createMockUser() as never);

        const response = await callHandler(createSignupBody({ token: "valid-token" }));

        expect(response.status).toBe(201);
      });
    });
  });
}
