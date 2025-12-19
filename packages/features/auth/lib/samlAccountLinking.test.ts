import type { PrismaClient } from "@prisma/client";
import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";

import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { OrganizationSettingsRepository } from "@calcom/features/organizations/repositories/OrganizationSettingsRepository";

import {
  SamlAccountLinkingService,
  getTeamIdFromSamlTenant,
  validateSamlAccountConversion,
} from "./samlAccountLinking";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

const mockPrismaClient = {} as PrismaClient;

let hasAcceptedMembershipSpy: MockInstance;
let getVerifiedDomainsSpy: MockInstance;

function setupMocks(config: { verifiedDomains?: string[]; hasMembership?: boolean }) {
  hasAcceptedMembershipSpy = vi
    .spyOn(MembershipRepository.prototype, "hasAcceptedMembershipByEmail")
    .mockResolvedValue(config.hasMembership ?? false);

  getVerifiedDomainsSpy = vi
    .spyOn(OrganizationSettingsRepository.prototype, "getVerifiedDomains")
    .mockResolvedValue(config.verifiedDomains ?? []);
}

describe("getTeamIdFromSamlTenant", () => {
  it("extracts team ID from valid tenant string", () => {
    expect(getTeamIdFromSamlTenant("team-123")).toBe(123);
    expect(getTeamIdFromSamlTenant("team-1")).toBe(1);
    expect(getTeamIdFromSamlTenant("team-999999")).toBe(999999);
  });

  it("returns null for invalid tenant formats", () => {
    expect(getTeamIdFromSamlTenant("")).toBeNull();
    expect(getTeamIdFromSamlTenant("invalid")).toBeNull();
    expect(getTeamIdFromSamlTenant("org-123")).toBeNull();
    expect(getTeamIdFromSamlTenant("team-")).toBeNull();
    expect(getTeamIdFromSamlTenant("team-abc")).toBeNull();
  });

  it("returns null for tenant with non-numeric ID", () => {
    expect(getTeamIdFromSamlTenant("team-abc123")).toBeNull();
  });

  it("truncates decimal values (parseInt behavior)", () => {
    expect(getTeamIdFromSamlTenant("team-12.5")).toBe(12);
  });
});

describe("SamlAccountLinkingService.isSamlIdpAuthoritativeForEmail", () => {
  let service: SamlAccountLinkingService;
  const ORG_TEAM_ID = 123;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns authoritative when email domain matches org verified domain", async () => {
    setupMocks({ verifiedDomains: ["acme.com"], hasMembership: false });
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "user@acme.com");

    expect(result).toEqual({ authoritative: true, reason: "domain_verified" });
    expect(hasAcceptedMembershipSpy).not.toHaveBeenCalled();
  });

  it("performs case-insensitive domain matching", async () => {
    setupMocks({ verifiedDomains: ["acme.com"] });
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "user@ACME.COM");

    expect(result).toEqual({ authoritative: true, reason: "domain_verified" });
  });

  it("matches subdomains of verified domain", async () => {
    setupMocks({ verifiedDomains: ["acme.com"] });
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "user@sales.acme.com");

    expect(result).toEqual({ authoritative: true, reason: "domain_verified" });
  });

  it("returns not authoritative when domain doesn't match and user is not member", async () => {
    setupMocks({ verifiedDomains: ["acme.com"], hasMembership: false });
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "user@different.com");

    expect(result).toEqual({ authoritative: false, reason: "domain_mismatch" });
  });

  it("returns authoritative for existing org member with different domain", async () => {
    setupMocks({ verifiedDomains: ["acme.com"], hasMembership: true });
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "user@personal-email.com");

    expect(result).toEqual({ authoritative: true, reason: "existing_member" });
  });

  it("skips membership check when domain matches", async () => {
    setupMocks({ verifiedDomains: ["acme.com"], hasMembership: true });
    service = new SamlAccountLinkingService(mockPrismaClient);

    await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "user@acme.com");

    expect(hasAcceptedMembershipSpy).not.toHaveBeenCalled();
  });

  it("returns not authoritative for invalid email", async () => {
    setupMocks({});
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "invalid-email");

    expect(result).toEqual({ authoritative: false, reason: "invalid_email" });
    expect(getVerifiedDomainsSpy).not.toHaveBeenCalled();
  });

  it("returns not authoritative for empty email", async () => {
    setupMocks({});
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "");

    expect(result).toEqual({ authoritative: false, reason: "invalid_email" });
  });

  it("falls back to membership when org has no verified domains", async () => {
    setupMocks({ verifiedDomains: [], hasMembership: true });
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "user@any-domain.com");

    expect(result).toEqual({ authoritative: true, reason: "existing_member" });
  });

  it("rejects when org has no verified domains and user is not member", async () => {
    setupMocks({ verifiedDomains: [], hasMembership: false });
    service = new SamlAccountLinkingService(mockPrismaClient);

    const result = await service.isSamlIdpAuthoritativeForEmail(ORG_TEAM_ID, "attacker@evil.com");

    expect(result).toEqual({ authoritative: false, reason: "domain_mismatch" });
  });
});

describe("validateSamlAccountConversion", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupMocks({ verifiedDomains: [], hasMembership: false });
  });

  it("blocks when no SAML tenant provided (deny by default)", async () => {
    const result = await validateSamlAccountConversion(undefined, "user@example.com", "CAL→SAML");
    expect(result).toEqual({
      allowed: false,
      errorUrl: "/auth/error?error=saml-idp-not-authoritative",
    });
  });

  it("allows when tenant is not org-based", async () => {
    const result = await validateSamlAccountConversion("Cal.com", "user@example.com", "CAL→SAML");
    expect(result).toEqual({ allowed: true });
  });

  it("blocks when IdP is not authoritative", async () => {
    const result = await validateSamlAccountConversion("team-123", "attacker@evil.com", "CAL→SAML");

    expect(result).toEqual({
      allowed: false,
      errorUrl: "/auth/error?error=saml-idp-not-authoritative",
    });
  });

  it("allows when IdP is authoritative", async () => {
    setupMocks({ verifiedDomains: ["acme.com"] });

    const result = await validateSamlAccountConversion("team-123", "user@acme.com", "CAL→SAML");

    expect(result).toEqual({ allowed: true });
  });
});

describe("Security: SAML Account Takeover Prevention", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks takeover when attacker org asserts victim's email", async () => {
    setupMocks({ verifiedDomains: ["attacker-org.com"], hasMembership: false });

    const result = await validateSamlAccountConversion("team-999", "victim@gmail.com", "Google→SAML");

    expect(result.allowed).toBe(false);
  });

  it("allows SSO when org owns the email domain", async () => {
    setupMocks({ verifiedDomains: ["acme.com"] });

    const result = await validateSamlAccountConversion("team-100", "employee@acme.com", "CAL→SAML");

    expect(result).toEqual({ allowed: true });
  });

  it("allows SSO for existing members with personal email", async () => {
    setupMocks({ verifiedDomains: ["acme.com"], hasMembership: true });

    const service = new SamlAccountLinkingService(mockPrismaClient);
    const result = await service.isSamlIdpAuthoritativeForEmail(100, "contractor@personal-email.com");

    expect(result.authoritative).toBe(true);
    expect(result.reason).toBe("existing_member");
  });

  it("blocks invite takeover when attacker org claims invited user", async () => {
    // Org A invites victim@gmail.com, attacker in Org B tries to claim via SAML
    setupMocks({ verifiedDomains: ["attacker-org.com"], hasMembership: false });

    const result = await validateSamlAccountConversion("team-999", "victim@gmail.com", "Invite→SAML");

    expect(result.allowed).toBe(false);
  });
});
