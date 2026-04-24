import { Reflector } from "@nestjs/core";

// PBAC (Permission-Based Access Control) is not available in community edition
// PermissionString is defined locally since the platform-libraries/pbac module was removed
type PermissionString = string;

export const Pbac = Reflector.createDecorator<PermissionString[]>();
