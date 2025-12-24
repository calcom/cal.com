import "@calcom/lib/__mocks__/logger";

import { createHash } from "crypto";
import type { GetServerSidePropsContext } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAbsoluteEventTypeRedirectUrlWithEmbedSupport } from "@calcom/app-store/routing-forms/getEventTypeRedirectUrl";
import { getResponseToStore } from "@calcom/app-store/routing-forms/lib/getResponseToStore";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { handleResponse } from "@calcom/app-store/routing-forms/lib/handleResponse";
import { findMatchingRoute } from "@calcom/app-store/routing-forms/lib/processRoute";
import { substituteVariables } from "@calcom/app-store/routing-forms/lib/substituteVariables";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isAuthorizedToViewFormOnOrgDomain } from "@calcom/features/routing-forms/lib/isAuthorizedToViewForm";
import { PrismaRoutingFormRepository } from "@calcom/features/routing-forms/repositories/PrismaRoutingFormRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

import { getRoutedUrl } from "./getRoutedUrl";
import { getUrlSearchParamsToForward } from "./getUrlSearchParamsToForward";

// Mock dependencies
vi.mock("./getUrlSearchParamsToForward");
vi.mock("@calcom/lib/checkRateLimitAndThrowError");
vi.mock("@calcom/app-store/routing-forms/lib/handleResponse");
vi.mock("@calcom/features/routing-forms/repositories/PrismaRoutingFormRepository");
vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(() => ({
      enrichUserWithItsProfile: vi.fn(),
    })),
  };
});
vi.mock("@calcom/features/ee/organizations/lib/orgDomains");
vi.mock("@calcom/features/routing-forms/lib/isAuthorizedToViewForm");
vi.mock("@calcom/app-store/routing-forms/lib/getSerializableForm");
vi.mock("@calcom/app-store/routing-forms/lib/getResponseToStore");
vi.mock("@calcom/app-store/routing-forms/lib/processRoute");
vi.mock("@calcom/app-store/routing-forms/lib/substituteVariables");
vi.mock("@calcom/app-store/routing-forms/getEventTypeRedirectUrl");
vi.mock("@calcom/app-store/routing-forms/enrichFormWithMigrationData", () => ({
  enrichFormWithMigrationData: vi.fn((form) => form),
}));
vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: unknown) => fn,
}));

const mockForm = {
  id: "form-id",
  user: { id: 1, name: "Test User" },
  team: null,
  name: "Test Form",
  fields: [],
  routes: [],
  userId: 1,
  teamId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  description: null,
  enabled: true,
  isDefault: false,
  fieldsOrder: [],
  position: 0,
  slug: "test-form",
};

const mockSerializableForm = {
  id: "form-id",
  fields: [{ id: "email", type: "email", label: "Email", identifier: "email" }],
  routes: [],
  user: { id: 1 },
};

const mockContext = (
  query: Record<string, unknown>,
  url = "/link/form-id"
): Pick<GetServerSidePropsContext, "query" | "req"> => ({
  query: { form: "form-id", ...query },
  req: { url },
});

describe("getRoutedUrl", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Provide default mock implementations
    vi.mocked(orgDomainConfig).mockReturnValue({ currentOrgDomain: null, isValidOrgDomain: false });
    vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(null);

    const mockEnrichUserWithItsProfile = vi.fn().mockImplementation(async ({ user }) => user);
    const mockUserRepository = vi.mocked(UserRepository);
    if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
      mockUserRepository.mockImplementation(
        () =>
          ({
            enrichUserWithItsProfile: mockEnrichUserWithItsProfile,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
      );
    }
    vi.mocked(isAuthorizedToViewFormOnOrgDomain).mockReturnValue(true);
    vi.mocked(getSerializableForm).mockResolvedValue(mockSerializableForm as never);
    vi.mocked(findMatchingRoute).mockReturnValue(null);
    vi.mocked(handleResponse).mockResolvedValue({
      teamMembersMatchingAttributeLogic: null,
      formResponse: { id: 1 },
      queuedFormResponse: null,
      attributeRoutingConfig: null,
      timeTaken: {},
      crmContactOwnerEmail: null,
      crmContactOwnerRecordType: null,
      crmAppSlug: null,
      isPreview: false,
    });
    vi.mocked(substituteVariables).mockImplementation((value) => value);
    vi.mocked(getUrlSearchParamsToForward).mockReturnValue(new URLSearchParams());
    vi.mocked(getAbsoluteEventTypeRedirectUrlWithEmbedSupport).mockImplementation(
      ({ eventTypeRedirectUrl }) => eventTypeRedirectUrl
    );
    vi.mocked(getResponseToStore).mockReturnValue({ email: "test@cal.com" });
  });

  it("should return notFound if query params are invalid", async () => {
    const context = {
      query: { wrong_param: "value" }, // 'form' is missing
      req: { url: "/link/form-id" },
    };
    // @ts-expect-error we are testing invalid input
    const result = await getRoutedUrl(context);
    expect(result).toEqual({ notFound: true });
  });

  it("should return notFound if form is not found", async () => {
    vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(null);
    const context = mockContext({});

    const result = await getRoutedUrl(context);
    expect(result).toEqual({ notFound: true });
    expect(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).toHaveBeenCalledWith("form-id");
  });

  it("should return notFound if user is not authorized", async () => {
    vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(
      mockForm as never
    );
    vi.mocked(isAuthorizedToViewFormOnOrgDomain).mockReturnValue(false);

    const context = mockContext({});
    const result = await getRoutedUrl(context);

    expect(result).toEqual({ notFound: true });
    expect(isAuthorizedToViewFormOnOrgDomain).toHaveBeenCalledWith({
      user: mockForm.user,
      team: mockForm.team,
      currentOrgDomain: null,
    });
  });

  it("should throw an error if no matching route is found", async () => {
    vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(
      mockForm as never
    );
    vi.mocked(getSerializableForm).mockResolvedValue(mockSerializableForm as never);
    vi.mocked(findMatchingRoute).mockReturnValue(null);

    const context = mockContext({});
    await expect(getRoutedUrl(context)).rejects.toThrow("No matching route could be found");
    expect(findMatchingRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        form: mockSerializableForm,
      })
    );
  });

  it("should return props with a message for customPageMessage action", async () => {
    vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(
      mockForm as never
    );
    const message = "This is a custom message";
    const mockRoute = { id: "route1", action: { type: "customPageMessage", value: message } };
    vi.mocked(findMatchingRoute).mockReturnValue(mockRoute as never);

    const context = mockContext({});
    const result = await getRoutedUrl(context);

    expect(result).toEqual({
      props: {
        isEmbed: false,
        form: mockSerializableForm,
        message: message,
        errorMessage: null,
      },
    });
    expect(handleResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        form: mockSerializableForm,
      })
    );
    expect(findMatchingRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        form: mockSerializableForm,
      })
    );
  });

  it("should return a redirect for eventTypeRedirectUrl action and substitute variables", async () => {
    vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(
      mockForm as never
    );
    const redirectUrl = "test-user/30min/{email}";
    const mockRoute = { id: "route1", action: { type: "eventTypeRedirectUrl", value: redirectUrl } };
    vi.mocked(findMatchingRoute).mockReturnValue(mockRoute as never);
    const substitutedUrl = "test-user/30min/test@cal.com";
    vi.mocked(substituteVariables).mockReturnValue(substitutedUrl);
    vi.mocked(getAbsoluteEventTypeRedirectUrlWithEmbedSupport).mockReturnValue(`/${substitutedUrl}`);

    const context = mockContext({ email: "test@cal.com" });
    const result = await getRoutedUrl(context);

    expect(substituteVariables).toHaveBeenCalledWith(
      redirectUrl,
      { email: "test@cal.com" },
      mockSerializableForm.fields
    );
    expect(getUrlSearchParamsToForward).toHaveBeenCalledWith(
      expect.objectContaining({
        searchParams: expect.any(URLSearchParams),
        formResponse: { email: "test@cal.com" },
        fields: mockSerializableForm.fields,
      })
    );
    expect(getAbsoluteEventTypeRedirectUrlWithEmbedSupport).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTypeRedirectUrl: substitutedUrl,
      })
    );
    expect(result).toEqual({
      redirect: {
        destination: `/${substitutedUrl}`,
        permanent: false,
      },
    });
  });

  it("should return a redirect for externalRedirectUrl action", async () => {
    vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(
      mockForm as never
    );
    const redirectUrl = "https://example.com";
    const mockRoute = { id: "route1", action: { type: "externalRedirectUrl", value: redirectUrl } };
    vi.mocked(findMatchingRoute).mockReturnValue(mockRoute as never);

    const context = mockContext({ email: "test@cal.com" });
    const result = await getRoutedUrl(context);

    const searchParams = new URLSearchParams({
      ...(context.query as Record<string, string>),
      "cal.action": "externalRedirectUrl",
    });
    expect(result).toEqual({
      redirect: {
        destination: `${redirectUrl}?${searchParams.toString()}`,
        permanent: false,
      },
    });
    expect(findMatchingRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        form: mockSerializableForm,
      })
    );
  });

  it("should call handleResponse with correct response prop obtained from getResponseToStore", async () => {
    vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(
      mockForm as never
    );
    const redirectUrl = "test-user/30min";
    const mockRoute = { id: "route1", action: { type: "eventTypeRedirectUrl", value: redirectUrl } };
    vi.mocked(findMatchingRoute).mockReturnValue(mockRoute as never);
    vi.mocked(getAbsoluteEventTypeRedirectUrlWithEmbedSupport).mockReturnValue(`/${redirectUrl}`);
    vi.mocked(getResponseToStore).mockReturnValue({ "xxx-xxx": { value: "test@cal.com" } } as never);

    const context = mockContext({ email: "test@cal.com" });
    await getRoutedUrl(context);

    expect(getResponseToStore).toHaveBeenCalledWith({
      formFields: mockSerializableForm.fields,
      fieldsResponses: { email: "test@cal.com" },
    });

    expect(handleResponse).toHaveBeenCalledWith(
      expect.objectContaining({ response: { "xxx-xxx": { value: "test@cal.com" } } })
    );
  });

  it("should throw an error if rate limit is exceeded", async () => {
    vi.mocked(checkRateLimitAndThrowError).mockRejectedValue(new Error("Rate limit exceeded"));
    const context = mockContext({ email: "test@cal.com" });
    const expectedHash = createHash("sha256")
      .update(JSON.stringify({ email: "test@cal.com" }))
      .digest("hex");

    await expect(getRoutedUrl(context)).rejects.toThrow("Rate limit exceeded");
    expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
      identifier: `form:form-id:hash:${expectedHash}`,
    });
  });

  describe("Dry Run", () => {
    it("should call handleResponse with isPreview:true", async () => {
      vi.mocked(PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg).mockResolvedValue(
        mockForm as never
      );
      const redirectUrl = "test-user/30min";
      const mockRoute = { id: "route1", action: { type: "eventTypeRedirectUrl", value: redirectUrl } };
      vi.mocked(findMatchingRoute).mockReturnValue(mockRoute as never);
      vi.mocked(getAbsoluteEventTypeRedirectUrlWithEmbedSupport).mockReturnValue(`/${redirectUrl}`);

      const context = mockContext({ "cal.isBookingDryRun": "true" });
      await getRoutedUrl(context);

      expect(handleResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          isPreview: true,
        })
      );
    });
  });
});
