export interface IDeploymentRepository {
  getLicenseKeyWithId(id: number): Promise<string | null>;
  getSignatureToken(id: number): Promise<string | null>;
}
