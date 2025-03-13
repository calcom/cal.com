import { HEADLESS_ROUTER_NO_REQ_FIELDS_ORG_IDS } from "@calcom/lib/constants";

export function canOrgSkipRequiredFields(orgId: number | null): boolean {
  if (!orgId) return false;
  return HEADLESS_ROUTER_NO_REQ_FIELDS_ORG_IDS.includes(orgId);
}
