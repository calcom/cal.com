import { Injectable } from "@nestjs/common";

import { getEnv } from "../../env";
import { DeploymentsRepository } from "../deployments/deployments.repository";

type LicenseCheckResponse = {
  valid: boolean;
};
@Injectable()
export class DeploymentsService {
  constructor(private readonly deploymentsRepository: DeploymentsRepository) {}

  private is_e2e = getEnv("IS_E2E");
  private licenseKey = getEnv("CALCOM_LICENSE_KEY");
  private licenseKeyUrl = getEnv("GET_LICENSE_KEY_URL");

  async checkLicense() {
    if (this.is_e2e) {
      return true;
    }
    let licenseKey = this.licenseKey;

    if (!licenseKey) {
      /** We try to check on DB only if env is undefined */
      const deployment = await this.deploymentsRepository.getDeployment();
      licenseKey = deployment?.licenseKey ?? undefined;
    }

    if (!licenseKey) {
      return false;
    }
    const licenseKeyUrl = this.licenseKeyUrl + `?key=${licenseKey}`;

    const response = await fetch(licenseKeyUrl, { mode: "cors" });
    const data = (await response.json()) as LicenseCheckResponse;
    return data.valid;
  }
}
