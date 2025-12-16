import posthog from "posthog-js";

import type { PlanType, InviteRole } from "../store/onboarding-store";

/**
 * Onboarding PostHog Tracking Events
 *
 * These events help track user progression through the onboarding flow,
 * identify drop-off points, and measure completion rates.
 */

type OnboardingStep =
  | "getting_started"
  | "personal_settings"
  | "personal_calendar"
  | "team_details"
  | "team_invite"
  | "team_invite_email"
  | "organization_details"
  | "organization_brand"
  | "organization_teams"
  | "organization_invite"
  | "organization_invite_email";

type OnboardingFlow = "personal" | "team" | "organization";

interface BaseEventProperties {
  /** Current step in the onboarding flow */
  step: OnboardingStep;
  /** Which flow the user is in */
  flow?: OnboardingFlow;
}

interface PlanSelectionProperties {
  /** The plan the user selected */
  plan: PlanType;
  /** Whether user has a company email (eligible for org) */
  is_company_email: boolean;
}

interface StepContinueProperties extends BaseEventProperties {
  /** How long user spent on this step (ms) */
  time_on_step_ms?: number;
}

interface StepSkipProperties extends BaseEventProperties {
  /** What was skipped (calendar, invites, brand, etc.) */
  skipped_action?: string;
}

interface TeamCreationProperties {
  team_name: string;
  team_slug: string;
  has_logo: boolean;
  has_bio: boolean;
}

interface OrganizationCreationProperties {
  org_name: string;
  org_slug: string;
  has_logo: boolean;
  has_banner: boolean;
  has_bio: boolean;
  teams_count: number;
  invites_count: number;
}

interface InviteProperties {
  invites_count: number;
  role: InviteRole;
  method: "email" | "csv" | "google_workspace";
}

interface OnboardingCompletedProperties {
  flow: OnboardingFlow;
  /** Total time from start to completion (ms) */
  total_time_ms?: number;
  /** Whether user connected a calendar */
  connected_calendar: boolean;
  /** Number of members invited */
  invites_sent: number;
}

/**
 * Track when onboarding flow starts
 */
export function trackOnboardingStarted(isCompanyEmail: boolean) {
  posthog.capture("onboarding_started", {
    is_company_email: isCompanyEmail,
  });
}

/**
 * Track when a plan is selected in the getting-started view
 */
export function trackPlanSelected(properties: PlanSelectionProperties) {
  posthog.capture("onboarding_plan_selected", properties);
}

/**
 * Track when user views a specific onboarding step
 */
export function trackStepViewed(properties: BaseEventProperties) {
  posthog.capture("onboarding_step_viewed", properties);
}

/**
 * Track when user continues to the next step
 */
export function trackStepContinued(properties: StepContinueProperties) {
  posthog.capture("onboarding_step_continued", properties);
}

/**
 * Track when user goes back to a previous step
 */
export function trackStepBack(properties: BaseEventProperties) {
  posthog.capture("onboarding_step_back", properties);
}

/**
 * Track when user skips a step
 */
export function trackStepSkipped(properties: StepSkipProperties) {
  posthog.capture("onboarding_step_skipped", properties);
}

/**
 * Track team creation during onboarding
 */
export function trackTeamCreated(properties: TeamCreationProperties) {
  posthog.capture("onboarding_team_created", properties);
}

/**
 * Track organization creation during onboarding
 */
export function trackOrganizationCreated(properties: OrganizationCreationProperties) {
  posthog.capture("onboarding_organization_created", properties);
}

/**
 * Track when invites are sent
 */
export function trackInvitesSent(properties: InviteProperties) {
  posthog.capture("onboarding_invites_sent", properties);
}

/**
 * Track calendar connection during onboarding
 */
export function trackCalendarConnected(appSlug: string) {
  posthog.capture("onboarding_calendar_connected", {
    app_slug: appSlug,
  });
}

/**
 * Track when onboarding is completed
 */
export function trackOnboardingCompleted(properties: OnboardingCompletedProperties) {
  posthog.capture("onboarding_completed", properties);
}

/**
 * Track when user redirected to payment during onboarding
 */
export function trackPaymentRedirect(flow: OnboardingFlow, planType: "team" | "organization") {
  posthog.capture("onboarding_payment_redirect", {
    flow,
    plan_type: planType,
  });
}
