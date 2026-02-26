import { describe, expect, it } from "vitest";

import { HttpError } from "./http-error";

describe("HttpError", () => {
  describe("constructor", () => {
    it("creates an error with statusCode and default message", () => {
      const error = new HttpError({ statusCode: 404 });
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("HTTP Error 404");
      expect(error.name).toBe("HttpError");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
    });

    it("uses custom message when provided", () => {
      const error = new HttpError({ statusCode: 400, message: "Bad Request" });
      expect(error.message).toBe("Bad Request");
      expect(error.statusCode).toBe(400);
    });

    it("stores url and method", () => {
      const error = new HttpError({
        statusCode: 500,
        url: "https://api.cal.com/v1/bookings",
        method: "POST",
      });
      expect(error.url).toBe("https://api.cal.com/v1/bookings");
      expect(error.method).toBe("POST");
    });

    it("stores cause error and inherits its stack", () => {
      const cause = new Error("original error");
      const error = new HttpError({ statusCode: 500, cause });
      expect(error.cause).toBe(cause);
      expect(error.stack).toBe(cause.stack);
    });

    it("stores data record", () => {
      const data = { field: "email", reason: "invalid" };
      const error = new HttpError({ statusCode: 422, data });
      expect(error.data).toEqual(data);
    });

    it("defaults url and method to undefined", () => {
      const error = new HttpError({ statusCode: 403 });
      expect(error.url).toBeUndefined();
      expect(error.method).toBeUndefined();
    });

    it("does not inherit stack when cause has no stack", () => {
      const cause = new Error("no stack");
      cause.stack = undefined;
      const error = new HttpError({ statusCode: 500, cause });
      expect(error.cause).toBe(cause);
      // stack is not overwritten when cause has no stack
    });
  });

  describe("fromRequest", () => {
    it("creates HttpError from Request and Response objects", () => {
      const request = new Request("https://api.cal.com/v1/bookings", { method: "POST" });
      const response = new Response(null, { status: 404, statusText: "Not Found" });
      const parsedError = { data: { id: 123 } };

      const error = HttpError.fromRequest(request, response, parsedError);

      expect(error).toBeInstanceOf(HttpError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Not Found");
      expect(error.method).toBe("POST");
      expect(error.data).toEqual({ id: 123 });
    });

    it("handles empty parsedError data", () => {
      const request = new Request("https://api.cal.com/v1/users", { method: "GET" });
      const response = new Response(null, { status: 500, statusText: "Internal Server Error" });
      const parsedError = {};

      const error = HttpError.fromRequest(request, response, parsedError);

      expect(error.statusCode).toBe(500);
      expect(error.data).toBeUndefined();
    });
  });
});
