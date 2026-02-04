export interface MockTeam {
  id: number;
  isOrganization: boolean;
  parent: { id: number; slug: string; organizationSettings: null } | null;
  organizationSettings: null;
}

export interface MockFoundToken {
  id: number;
  teamId: number | null;
  expires: Date;
}

export interface MockUser {
  id: number;
}

export interface SignupBody {
  email: string;
  password: string;
  username: string;
  language: string;
  token?: string;
}

export function createMockTeam(overrides: Partial<MockTeam> = {}): MockTeam {
  return {
    id: 1,
    isOrganization: true,
    parent: null,
    organizationSettings: null,
    ...overrides,
  };
}

export function createMockFoundToken(overrides: Partial<MockFoundToken> = {}): MockFoundToken {
  return {
    id: 1,
    teamId: 1,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 1,
    ...overrides,
  };
}

export function createSignupBody(overrides: Partial<SignupBody> = {}): SignupBody {
  return {
    email: "test@example.com",
    password: "ValidPassword123!",
    username: "testuser",
    language: "en",
    ...overrides,
  };
}
