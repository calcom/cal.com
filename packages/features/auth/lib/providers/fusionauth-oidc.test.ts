import { FusionAuthOIDCProvider } from "../fusionauth-oidc";

describe("FusionAuthOIDCProvider", () => {
  const mockConfig = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    issuer: "https://test.fusionauth.com",
    name: "Test FusionAuth",
    enabled: true,
  };

  it("should create a provider with correct configuration", () => {
    const provider = FusionAuthOIDCProvider(mockConfig);

    expect(provider).toBeDefined();
    expect(provider.id).toBe("fusionauth-oidc");
    expect(provider.name).toBe("Test FusionAuth");
    expect(provider.type).toBe("oauth");
    expect(provider.version).toBe("2.0");
    expect(provider.checks).toEqual(["pkce", "state"]);
  });

  it("should have correct authorization URL", () => {
    const provider = FusionAuthOIDCProvider(mockConfig);

    expect(provider.authorization.url).toBe("https://test.fusionauth.com/oauth2/authorize");
    expect(provider.authorization.params.scope).toBe("openid profile email");
    expect(provider.authorization.params.response_type).toBe("code");
    expect(provider.authorization.params.client_id).toBe("test-client-id");
  });

  it("should have correct token URL", () => {
    const provider = FusionAuthOIDCProvider(mockConfig);

    expect(provider.token.url).toBe("https://test.fusionauth.com/oauth2/token");
    expect(provider.token.params.grant_type).toBe("authorization_code");
  });

  it("should have correct userinfo URL", () => {
    const provider = FusionAuthOIDCProvider(mockConfig);

    expect(provider.userinfo).toBe("https://test.fusionauth.com/oauth2/userinfo");
  });

  it("should return null when disabled", () => {
    const disabledConfig = { ...mockConfig, enabled: false };
    const provider = FusionAuthOIDCProvider(disabledConfig);

    expect(provider).toBeNull();
  });

  it("should return null when missing required config", () => {
    const incompleteConfig = { ...mockConfig, clientId: "" };
    const provider = FusionAuthOIDCProvider(incompleteConfig);

    expect(provider).toBeNull();
  });

  it("should map profile correctly", async () => {
    const provider = FusionAuthOIDCProvider(mockConfig);
    const mockProfile = {
      sub: "user123",
      email: "test@example.com",
      email_verified: true,
      name: "Test User",
      given_name: "Test",
      family_name: "User",
      picture: "https://example.com/avatar.jpg",
      locale: "en-US",
    };

    const result = await provider.profile(mockProfile);

    expect(result.id).toBe("user123");
    expect(result.email).toBe("test@example.com");
    expect(result.name).toBe("Test User");
    expect(result.image).toBe("https://example.com/avatar.jpg");
    expect(result.email_verified).toBe(true);
    expect(result.locale).toBe("en-US");
  });

  it("should handle missing profile fields", async () => {
    const provider = FusionAuthOIDCProvider(mockConfig);
    const minimalProfile = {
      sub: "user123",
      email: "test@example.com",
    };

    const result = await provider.profile(minimalProfile);

    expect(result.id).toBe("user123");
    expect(result.email).toBe("test@example.com");
    expect(result.name).toBe(" ");
    expect(result.email_verified).toBe(false);
    expect(result.locale).toBe("en");
  });

  it("should construct name from given_name and family_name", async () => {
    const provider = FusionAuthOIDCProvider(mockConfig);
    const profileWithNames = {
      sub: "user123",
      email: "test@example.com",
      given_name: "John",
      family_name: "Doe",
    };

    const result = await provider.profile(profileWithNames);

    expect(result.name).toBe("John Doe");
  });

  it("should have correct options", () => {
    const provider = FusionAuthOIDCProvider(mockConfig);

    expect(provider.options.clientId).toBe("test-client-id");
    expect(provider.options.clientSecret).toBe("test-client-secret");
  });

  it("should allow dangerous email account linking", () => {
    const provider = FusionAuthOIDCProvider(mockConfig);

    expect(provider.allowDangerousEmailAccountLinking).toBe(true);
  });
});
