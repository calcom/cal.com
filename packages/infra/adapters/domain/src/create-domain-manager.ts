import type { DomainManager } from "./domain-manager";
import { NoOpDomainManager } from "./no-op-domain-manager";
import type { VercelDomainManagerConfig } from "./vercel-domain-manager";
import { VercelDomainManager } from "./vercel-domain-manager";

export type DomainManagerConfig = ({ provider: "vercel" } & VercelDomainManagerConfig) | { provider: "noop" };

export function createDomainManager(config: DomainManagerConfig): DomainManager {
  switch (config.provider) {
    case "vercel":
      return new VercelDomainManager(config);
    case "noop":
      return new NoOpDomainManager();
  }
}
