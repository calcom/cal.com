import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { ConferencingService } from "../services/conferencing.service";
import { ConferencingController } from "./conferencing.controller";

describe("ConferencingController", () => {
  const conferencingService = {
    connectOauthApps: jest.fn(),
  } as unknown as ConferencingService;

  const config = {
    get: jest.fn((key: string) => {
      if (key === "app.baseUrl") {
        return "https://app.cal.com";
      }

      if (key === "api.url") {
        return "https://api.cal.com/v2";
      }

      return undefined;
    }),
  } as unknown as ConfigService;

  const httpService = {
    axiosRef: {
      get: jest.fn(),
    },
  } as unknown as HttpService;

  const controller = new ConferencingController(conferencingService, config, httpService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("falls back to a safe internal redirect when onErrorReturnTo is external", async () => {
    const state = JSON.stringify({
      onErrorReturnTo: "https://evil.com",
      fromApp: false,
      accessToken: "dummy-access-token",
    });

    const response = await controller.save(state, "zoom", "code", "1", undefined);

    expect(response.url).toBe("https://app.cal.com/apps/installed/conferencing");
    expect(httpService.axiosRef.get).not.toHaveBeenCalled();
    expect(conferencingService.connectOauthApps).not.toHaveBeenCalled();
  });

  it("sanitizes the proxy success redirect when the upstream returns an external url", async () => {
    httpService.axiosRef.get = jest.fn().mockResolvedValue({
      data: { url: "https://evil.com" },
    }) as unknown as typeof httpService.axiosRef.get;

    const state = JSON.stringify({
      onErrorReturnTo: "https://evil.com/fallback",
      fromApp: false,
      accessToken: "dummy-access-token",
      teamId: "team-id",
      orgId: "org-id",
    });

    const response = await controller.save(state, "zoom", "code", undefined, undefined);

    expect(httpService.axiosRef.get).toHaveBeenCalledWith(
      "https://api.cal.com/v2/organizations/org-id/teams/team-id/conferencing/zoom/oauth/callback",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer dummy-access-token",
        },
      })
    );
    expect(response.url).toBe("https://app.cal.com/apps/installed/conferencing");
    expect(conferencingService.connectOauthApps).not.toHaveBeenCalled();
  });

  it("sanitizes the proxy error fallback when the upstream request throws", async () => {
    httpService.axiosRef.get = jest
      .fn()
      .mockRejectedValue(new Error("proxy failed")) as unknown as typeof httpService.axiosRef.get;

    const state = JSON.stringify({
      onErrorReturnTo: "https://evil.com/fallback",
      fromApp: false,
      accessToken: "dummy-access-token",
      teamId: "team-id",
      orgId: "org-id",
    });

    const response = await controller.save(state, "zoom", "code", undefined, undefined);

    expect(response.url).toBe("https://app.cal.com/apps/installed/conferencing");
    expect(conferencingService.connectOauthApps).not.toHaveBeenCalled();
  });

  it("rejects malformed state values", async () => {
    await expect(controller.save("not-json", "zoom", "code", "1", undefined)).rejects.toThrow(
      "Invalid `state` query param"
    );
  });

  it.each([null, [], "hello", 42, true])("rejects non-object state values: %p", async (state) => {
    await expect(controller.save(JSON.stringify(state), "zoom", "code", "1", undefined)).rejects.toThrow(
      "Invalid `state` query param"
    );
  });
});
