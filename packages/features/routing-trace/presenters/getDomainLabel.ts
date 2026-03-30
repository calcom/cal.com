import { ROUTING_TRACE_DOMAINS } from "../constants";

const DOMAIN_LABELS: Record<string, string> = {
  [ROUTING_TRACE_DOMAINS.SALESFORCE]: "Salesforce",
  [ROUTING_TRACE_DOMAINS.ROUTING_FORM]: "Routing Form",
};

export function getDomainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain;
}
