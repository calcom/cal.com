/**
 * Shared type definitions for branding functionality
 * Used across multiple booking-related services to avoid code duplication
 */

export interface TeamBrandingContext {
  id: number;
  hideBranding: boolean | null;
  parentId: number | null;
  parent: {
    hideBranding: boolean | null;
  } | null;
}

export interface UserBrandingContext {
  id: number;
  hideBranding: boolean | null;
}

export interface BrandingServiceParams {
  eventTypeId: number;
  teamContext?: TeamBrandingContext | null;
  owner?: UserBrandingContext | null;
  organizationId?: number | null;
  ownerIdFallback?: number | null;
}
