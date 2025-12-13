export interface AccessCodeValidDto {
  userId: number | null;
  teamId: number | null;
  scopes: string[];
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}

export interface IAccessCodeRepository {
  findValidCode(code: string, clientId: string): Promise<AccessCodeValidDto | null>;
  deleteExpiredAndUsedCodes(code: string, clientId: string): Promise<void>;
}
