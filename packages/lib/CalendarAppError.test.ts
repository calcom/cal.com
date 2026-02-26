import { describe, expect, it } from "vitest";
import {
  CalendarAppDelegationCredentialClientIdNotAuthorizedError,
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialError,
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialNotSetupError,
  CalendarAppError,
} from "./CalendarAppError";

describe("CalendarAppError", () => {
  it("creates error with correct name and message", () => {
    const error = new CalendarAppError("calendar error");

    expect(error.message).toBe("calendar error");
    expect(error.name).toBe("CalendarAppError");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("CalendarAppDelegationCredentialError", () => {
  it("creates error with correct name and message", () => {
    const error = new CalendarAppDelegationCredentialError("delegation error");

    expect(error.message).toBe("delegation error");
    expect(error.name).toBe("CalendarAppDelegationCredentialError");
  });

  it("is instance of CalendarAppError", () => {
    const error = new CalendarAppDelegationCredentialError("test");

    expect(error).toBeInstanceOf(CalendarAppError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("CalendarAppDelegationCredentialConfigurationError", () => {
  it("creates error with correct name and message", () => {
    const error = new CalendarAppDelegationCredentialConfigurationError("config error");

    expect(error.message).toBe("config error");
    expect(error.name).toBe("CalendarAppDelegationCredentialConfigurationError");
  });

  it("is instance of CalendarAppDelegationCredentialError", () => {
    const error = new CalendarAppDelegationCredentialConfigurationError("test");

    expect(error).toBeInstanceOf(CalendarAppDelegationCredentialError);
    expect(error).toBeInstanceOf(CalendarAppError);
  });
});

describe("CalendarAppDelegationCredentialInvalidGrantError", () => {
  it("creates error with correct name and message", () => {
    const error = new CalendarAppDelegationCredentialInvalidGrantError("invalid grant");

    expect(error.message).toBe("invalid grant");
    expect(error.name).toBe("CalendarAppDelegationCredentialInvalidGrantError");
  });

  it("is instance of CalendarAppDelegationCredentialError", () => {
    const error = new CalendarAppDelegationCredentialInvalidGrantError("test");

    expect(error).toBeInstanceOf(CalendarAppDelegationCredentialError);
    expect(error).toBeInstanceOf(CalendarAppError);
  });
});

describe("CalendarAppDelegationCredentialClientIdNotAuthorizedError", () => {
  it("creates error with correct name and message", () => {
    const error = new CalendarAppDelegationCredentialClientIdNotAuthorizedError("not authorized");

    expect(error.message).toBe("not authorized");
    expect(error.name).toBe("CalendarAppDelegationCredentialClientIdNotAuthorizedError");
  });

  it("is instance of CalendarAppDelegationCredentialConfigurationError", () => {
    const error = new CalendarAppDelegationCredentialClientIdNotAuthorizedError("test");

    expect(error).toBeInstanceOf(CalendarAppDelegationCredentialConfigurationError);
    expect(error).toBeInstanceOf(CalendarAppDelegationCredentialError);
    expect(error).toBeInstanceOf(CalendarAppError);
  });
});

describe("CalendarAppDelegationCredentialNotSetupError", () => {
  it("creates error with correct name and message", () => {
    const error = new CalendarAppDelegationCredentialNotSetupError("not setup");

    expect(error.message).toBe("not setup");
    expect(error.name).toBe("CalendarAppDelegationCredentialNotSetupError");
  });

  it("is instance of CalendarAppDelegationCredentialConfigurationError", () => {
    const error = new CalendarAppDelegationCredentialNotSetupError("test");

    expect(error).toBeInstanceOf(CalendarAppDelegationCredentialConfigurationError);
    expect(error).toBeInstanceOf(CalendarAppDelegationCredentialError);
    expect(error).toBeInstanceOf(CalendarAppError);
  });
});
