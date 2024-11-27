import type { Blacklist } from "./blacklist.model";

export interface IBlacklistRepository {
  getEmailInBlacklist(email: string): Promise<Blacklist | null>;
}
