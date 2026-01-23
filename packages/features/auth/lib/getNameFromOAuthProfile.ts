type OAuthProfile = {
  given_name?: string;
  family_name?: string;
  firstName?: string;
  lastName?: string;
};

type NameResult = {
  givenName: string;
  lastName: string | null;
};

/**
 * Extracts givenName and lastName from OAuth profile data.
 * Google provides given_name and family_name, SAML provides firstName and lastName.
 * Falls back to splitting the full name if profile fields are missing.
 */
export const getNameFromOAuthProfile = (
  profile: OAuthProfile | undefined,
  fullName: string | null | undefined
): NameResult => {
  let givenName = profile?.given_name || profile?.firstName || "";
  let lastName: string | null = profile?.family_name || profile?.lastName || null;

  if ((!givenName || !lastName) && fullName) {
    const nameParts = fullName.trim().split(/\s+/);
    if (!givenName) {
      givenName = nameParts[0] || "";
    }
    if (!lastName && nameParts.length > 1) {
      lastName = nameParts.slice(1).join(" ");
    }
  }

  return { givenName, lastName };
};
