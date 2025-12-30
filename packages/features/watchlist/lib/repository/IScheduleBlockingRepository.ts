/**
 * Interface for schedule blocking repository operations.
 * Abstracts database operations for blocking/unblocking user schedules.
 */
export interface IScheduleBlockingRepository {
  blockSchedulesByEmail(email: string): Promise<{ count: number }>;

  blockSchedulesByEmails(emails: string[]): Promise<{ count: number }>;

  blockSchedulesByDomain(domain: string): Promise<{ count: number }>;

  unblockSchedulesByEmails(emails: string[]): Promise<{ count: number }>;

  findUserEmailsForEmail(email: string): Promise<string[]>;

  findUserEmailsForDomain(domain: string): Promise<string[]>;

  isUserStillBlocked(userEmail: string): Promise<boolean>;
}
