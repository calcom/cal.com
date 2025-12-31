import type {
  DateRangeParams,
  GetDeploymentUsageResponse,
  GetKeysResponse,
  GetKeyUsageResponse,
  ListDeploymentsParams,
  ListDeploymentsResponse,
  PaginationParams,
  RegenerateSignatureResponse,
} from "./LicenseKeyAdminService.types";

export interface ILicenseKeyAdminService {
  listDeployments(
    params?: ListDeploymentsParams
  ): Promise<ListDeploymentsResponse>;
  getKeysByDeployment(
    deploymentId: string,
    params?: PaginationParams
  ): Promise<GetKeysResponse>;
  getUsageByDeployment(
    deploymentId: string,
    params: DateRangeParams
  ): Promise<GetDeploymentUsageResponse>;
  getUsageByKey(
    keyId: string,
    params: DateRangeParams
  ): Promise<GetKeyUsageResponse>;
  regenerateSignatureToken(
    deploymentId: string
  ): Promise<RegenerateSignatureResponse>;
}
