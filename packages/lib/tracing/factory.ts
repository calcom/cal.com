import { nanoid } from "nanoid";

import logger from "../logger";
import { DistributedTracing, type IdGenerator } from "./index";

// Create dependency instances
const idGenerator: IdGenerator = {
  generate: () => nanoid(),
};

// Initialize DistributedTracing with dependencies
export function createDistributedTracing(): DistributedTracing {
  return new DistributedTracing(idGenerator, logger);
}

// Export a singleton instance for convenience
export const distributedTracing = createDistributedTracing();
