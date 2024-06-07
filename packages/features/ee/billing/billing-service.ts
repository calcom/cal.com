export interface BillingService {
  handleTeamCreation(): Promise<void>;
  handleTeamCancellation(): Promise<void>;
  handleTeamDebt(): Promise<void>;
  handleTeamDeletion(): Promise<void>;
  handlePaymentSuccess(): Promise<void>;
  handleSetupSuccess(): Promise<void>;
}
