import { beforeEach, describe, expect, it } from "vitest";
import { SIGNUP_ERROR_CODES } from "../../constants";
import type { MockResponse } from "./mocks/next.mocks";
import type { SignupBody } from "./mocks/signup.factories";
import { createSignupBody } from "./mocks/signup.factories";

type CallHandler = (body: SignupBody) => Promise<MockResponse>;

/**
 * Shared test suite that verifies both signup handlers return the correct
 * error code when `validateAndGetCorrectedUsernameAndEmail` reports an
 * existing user in the non-token (direct signup) flow.
 */
export function runEmailAlreadyExistsTestSuite(
  handlerName: string,
  callHandler: CallHandler,
  setupMocks: () => void,
  overrideValidation: (
    result: { isValid: boolean; username: undefined; email: string } | { isValid: boolean; username: string; email: string | undefined }
  ) => void
): void {
  describe(`${handlerName} – email already exists (non-token flow)`, () => {
    beforeEach(setupMocks);

    it("returns 409 with user_already_exists when email is already registered", async () => {
      overrideValidation({ isValid: false, username: undefined, email: "test@example.com" });

      const response = await callHandler(createSignupBody());

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
      });
    });
  });
}
