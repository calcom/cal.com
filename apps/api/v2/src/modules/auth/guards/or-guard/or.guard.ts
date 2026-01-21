import { Injectable, CanActivate, ExecutionContext, Type, Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";

/**
 * Decorator function that creates an Or guard with the specified guards
 * @param guards Array of guard classes to evaluate with OR logic
 * @returns A guard class that grants access if ANY of the provided guards return true
 */
export function Or(guards: Type<CanActivate>[]) {
  @Injectable()
  class OrGuard implements CanActivate {
    public readonly logger = new Logger("OrGuard");

    constructor(public readonly moduleRef: ModuleRef) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      let lastError: unknown | null = null;
      for (const Guard of guards) {
        try {
          const guardInstance = this.moduleRef.get(Guard, { strict: false });
          const result = await Promise.resolve(guardInstance.canActivate(context));

          if (result === true) {
            this.logger.log(`OrGuard - Guard ${Guard.name} granted access`);
            return true; // Access granted if any guard returns true
          }
        } catch (error) {
          lastError = error;
          // If a guard throws an exception, it implies failure for that specific guard.
          // We catch it and continue checking other guards in the OR chain.
          // If an exception should stop the entire chain immediately, re-throw it here.
          this.logger.log(
            `OrGuard - Guard ${Guard.name} failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      this.logger.log("OrGuard - All guards failed, access denied");
      if (lastError) {
        throw lastError;
      }
      return false;
    }
  }

  return OrGuard;
}
