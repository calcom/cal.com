import { Icon } from "@calcom/ui/components/icon";

import { ROUTING_TRACE_DOMAINS } from "../constants";

import type { IconName } from "@calcom/ui/components/icon";

const DOMAIN_ICONS: Record<
  string,
  { type: "icon"; name: IconName } | { type: "img"; src: string; alt: string }
> = {
  [ROUTING_TRACE_DOMAINS.SALESFORCE]: {
    type: "img",
    src: "/app-store/salesforce/icon.png",
    alt: "Salesforce",
  },
  [ROUTING_TRACE_DOMAINS.ROUTING_FORM]: { type: "icon", name: "file-text" },
};

const DEFAULT_ICON: IconName = "shuffle";

export function DomainIcon({ domain }: { domain: string }) {
  const config = DOMAIN_ICONS[domain];

  if (config?.type === "img") {
    return <img src={config.src} alt={config.alt} className="h-4 w-4" />;
  }

  return <Icon name={config?.type === "icon" ? config.name : DEFAULT_ICON} className="text-subtle h-4 w-4" />;
}
