import { RequestIdMiddleware } from "@/middleware/request-ids/request-id.middleware";
import { createRequest, createResponse } from "node-mocks-http";

describe("RequestIdMiddleware", () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it("should use x-vercel-id header as requestId when present", () => {
    const vercelId = "iad1::abcde-1234567890";
    const req = createRequest({
      headers: { "x-vercel-id": vercelId },
    });
    const res = createResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers["X-Request-Id"]).toBe(vercelId);
    expect(next).toHaveBeenCalled();
  });

  it("should generate a UUID when x-vercel-id header is absent", () => {
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    const requestId = req.headers["X-Request-Id"] as string;
    expect(requestId).toBeDefined();
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(next).toHaveBeenCalled();
  });

  it("should call next()", () => {
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
