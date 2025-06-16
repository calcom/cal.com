// This file provides a singleton pattern for the Prisma client to ensure only one instance is used throughout the application or test lifecycle.
// In test environments (e.g., Playwright, Jest), not using a singleton can cause:
// - Too many open database connections (exhausting the pool)
// - Resource leaks and hanging test processes
// - Test flakiness due to inconsistent state or connection errors
// - Difficulty in cleanup, as multiple clients may not be properly disconnected
// Using a singleton ensures reliable, efficient, and predictable test execution.
import { getPrismaClient } from "./store/prismaStore";

// Holds the singleton instance of the Prisma client.
let _prisma: ReturnType<typeof getPrismaClient>;

// Returns the singleton Prisma client instance. If it doesn't exist, it creates one.
// This ensures that all parts of the codebase use the same Prisma client, preventing multiple connections and related issues.
export const getPrisma = () => {
  if (!_prisma) {
    _prisma = getPrismaClient();
  }
  return _prisma;
};

// Export a single Prisma client instance for convenience.
// This is useful for most use cases where a single shared instance is sufficient.
export const prisma = getPrisma();

// Function to disconnect the Prisma client.
// This is important for cleaning up resources, especially in tests or scripts that exit after execution.
// Ensures all database connections are properly closed, preventing hanging processes.
export const disconnectPrisma = async () => {
  if (_prisma) {
    await _prisma.$disconnect();
  }
};
