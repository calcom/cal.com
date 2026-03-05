import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";
import slugify from "@calcom/lib/slugify";
import type { UserRepository } from "../repositories/UserRepository";

const cachedBlacklist: Set<string> = new Set();

interface ValidateAvailabilityParams {
  username: string;
  organizationId: number | null;
  /** When provided, allows the user to reclaim their own existing username */
  currentUserEmail?: string;
}

interface ValidateAvailabilityResult {
  available: boolean;
  premium: boolean;
  suggestion?: string;
}

export class UsernameValidationService {
  constructor(private userRepository: UserRepository) {}

  async validateAvailability({
    username: rawUsername,
    organizationId,
    currentUserEmail,
  }: ValidateAvailabilityParams): Promise<ValidateAvailabilityResult> {
    const username = slugify(rawUsername);

    const existingUser = await this.userRepository.findByUsernameAndOrg(
      username,
      organizationId,
      currentUserEmail
    );

    let available: boolean;
    if (existingUser) {
      available = false;
    } else {
      const isGlobalNamespace = organizationId === null;
      available = isGlobalNamespace ? !(await this.isReservedDueToMigration(username)) : true;
    }

    const premium = await this.isPremium(username);

    const result: ValidateAvailabilityResult = { available, premium };

    if (!available) {
      result.suggestion = await this.generateSuggestion(username, organizationId);
    }

    return result;
  }

  async isReservedDueToMigration(username: string): Promise<boolean> {
    return this.userRepository.isMigrationRedirectReserved(username);
  }

  async isPremium(username: string): Promise<boolean> {
    if (!IS_PREMIUM_USERNAME_ENABLED) {
      return false;
    }
    return username.length <= 4 || (await this.isBlacklisted(username));
  }

  deriveFromEmail(
    email: string,
    orgAutoAcceptEmail: string,
    options?: { isPlatformManaged?: boolean }
  ): string {
    const [emailUser, emailDomain = ""] = email.split("@");
    const [domainName, TLD] = emailDomain.split(".");

    if (emailDomain === orgAutoAcceptEmail) {
      return slugify(emailUser);
    }

    return options?.isPlatformManaged
      ? slugify(`${emailUser}-${domainName}-${TLD}`)
      : slugify(`${emailUser}-${domainName}`);
  }

  async generateSuggestion(username: string, organizationId: number | null): Promise<string> {
    const existingUsernames = await this.userRepository.findSimilarUsernames(username, organizationId);
    const limit = username.length < 2 ? 9999 : 999;
    let rand = 1;

    while (existingUsernames.includes(username + String(rand).padStart(4 - rand.toString().length, "0"))) {
      rand = Math.ceil(1 + Math.random() * (limit - 1));
    }

    return username + String(rand).padStart(4 - rand.toString().length, "0");
  }

  private async isBlacklisted(username: string): Promise<boolean> {
    if (!cachedBlacklist.size && process.env.USERNAME_BLACKLIST_URL) {
      const resp = await fetch(process.env.USERNAME_BLACKLIST_URL);
      const text = await resp.text();
      text.split("\n").forEach((entry) => cachedBlacklist.add(entry));
    }
    return cachedBlacklist.has(username);
  }
}
