import { subdomainSuffix } from "@calcom/ee/organizations/lib/orgDomains";
import logger from "@calcom/lib/logger";

import { deleteDnsRecord, addDnsRecord } from "./deploymentServices/cloudflare";
import {
  deleteDomain as deleteVercelDomain,
  createDomain as createVercelDomain,
} from "./deploymentServices/vercel";

const log = logger.getSubLogger({ prefix: ["domainManager/organization"] });
export const deleteDomain = async (slug: string) => {
  const domain = `${slug}.${subdomainSuffix()}`;
  // We must have some domain deleted
  let isDomainDeleted = false;

  // TODO: Ideally we should start storing the DNS and domain entries in DB for each organization
  // A separate DNS record is optional but if we have it, we must have it deleted
  let isDnsRecordDeleted = true;
  if (process.env.VERCEL_URL) {
    isDomainDeleted = await deleteVercelDomain(domain);
  }

  if (process.env.CLOUDFLARE_DNS) {
    isDnsRecordDeleted = await deleteDnsRecord(domain);
  }
  return isDomainDeleted && isDnsRecordDeleted;
  return false;
};

export const createDomain = async (slug: string) => {
  const domain = `${slug}.${subdomainSuffix()}`;

  // We must have some domain configured
  let domainConfigured = false;

  // A separate DNS record is optional but if we have it, we must have it configured
  let dnsConfigured = true;

  if (process.env.VERCEL_URL) {
    domainConfigured = await createVercelDomain(domain);
  }

  if (process.env.CLOUDFLARE_DNS) {
    dnsConfigured = await addDnsRecord(domain);
  }

  return domainConfigured && dnsConfigured;
};

export const renameDomain = async (oldSlug: string | null, newSlug: string) => {
  // First create new domain so that if it fails we still have the old domain
  await createDomain(newSlug);
  if (oldSlug) {
    try {
      await deleteDomain(oldSlug);
    } catch (e) {
      log.error(`renameDomain: Failed to delete old domain ${oldSlug}. Do a manual deletion if needed`);
    }
  }
};
