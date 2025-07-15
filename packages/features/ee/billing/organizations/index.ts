import { IS_PRODUCTION } from "@calcom/lib/constants";

import { InternalOrganizationBilling } from "./internal-organization-billing";
import { OrganizationBillingRepository } from "./organizationBillingRepository";
import { StubOrganizationBilling } from "./stub-organization-billing";

export { OrganizationBillingRepository };

export const OrganizationBilling = IS_PRODUCTION ? InternalOrganizationBilling : StubOrganizationBilling;
