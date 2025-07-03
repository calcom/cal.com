export interface IDeploymentRepository {
  getLicenseKeyWithId(id: number): Promise<string | null>;
}
