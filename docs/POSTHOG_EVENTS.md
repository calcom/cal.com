# PostHog Events Documentation

This document lists all PostHog events tracked in the Cal.com codebase. It is organized by feature area and includes the route/file location and properties sent with each event.

Last updated: December 2024

---

## Table of Contents

1. [Pageview Events](#pageview-events)
2. [Signup Events](#signup-events)
3. [Onboarding Events](#onboarding-events)
4. [Email Verification Events](#email-verification-events)
5. [Team Events](#team-events)
6. [App Store Events](#app-store-events)
7. [Routing Forms Events](#routing-forms-events)
8. [Workflows & Cal.ai Events](#workflows--calai-events)
9. [Insights Events](#insights-events)
10. [Navigation Events](#navigation-events)
11. [Tips Events](#tips-events)
12. [Settings Events](#settings-events)
13. [Availability Events](#availability-events)

---

## Pageview Events

### `$pageview`

Tracks page views on specific routes.

**File:** `packages/features/ee/event-tracking/lib/posthog/web/PostHogPageView.tsx`

**Tracked Routes:**
- `/signup`
- `/auth/verify-email`
- `/getting-started`
- `/onboarding/getting-started`
- `/settings/teams/new`
- `/settings/teams`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `$current_url` | string | The full URL of the page being viewed |

---

## Signup Events

### `signup_form_submitted`

Fired when a user submits the signup form.

**File:** `apps/web/modules/signup-view.tsx`

**Route:** `/signup`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `has_token` | boolean | Whether the user has an invite token |
| `is_org_invite` | boolean | Whether this is an organization invite by link |
| `org_slug` | string | The organization slug (if applicable) |
| `is_premium_username` | boolean | Whether the username is premium |
| `username_taken` | boolean | Whether the username is already taken |

---

### `signup_form_submit_error`

Fired when there's an error submitting the signup form.

**File:** `apps/web/modules/signup-view.tsx`

**Route:** `/signup`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `has_token` | boolean | Whether the user has an invite token |
| `is_org_invite` | boolean | Whether this is an organization invite by link |
| `org_slug` | string | The organization slug (if applicable) |
| `is_premium_username` | boolean | Whether the username is premium |
| `error_message` | string | The error message |

---

### `signup_google_button_clicked`

Fired when a user clicks the "Continue with Google" button on signup.

**File:** `apps/web/modules/signup-view.tsx`

**Route:** `/signup`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `has_token` | boolean | Whether the user has an invite token |
| `is_org_invite` | boolean | Whether this is an organization invite by link |
| `org_slug` | string | The organization slug (if applicable) |
| `has_prepopulated_username` | boolean | Whether a username was pre-populated |

---

### `signup_email_button_clicked`

Fired when a user clicks the email signup button.

**File:** `apps/web/modules/signup-view.tsx`

**Route:** `/signup`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `has_token` | boolean | Whether the user has an invite token |
| `is_org_invite` | boolean | Whether this is an organization invite by link |
| `org_slug` | string | The organization slug (if applicable) |

---

### `signup_saml_button_clicked`

Fired when a user clicks the SAML/SSO signup button.

**File:** `apps/web/modules/signup-view.tsx`

**Route:** `/signup`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `has_token` | boolean | Whether the user has an invite token |
| `is_org_invite` | boolean | Whether this is an organization invite by link |
| `org_slug` | string | The organization slug (if applicable) |

---

### `signup_saml_submit_button_clicked`

Fired when a user submits the SAML/SSO signup form.

**File:** `apps/web/modules/signup-view.tsx`

**Route:** `/signup`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `has_token` | boolean | Whether the user has an invite token |
| `is_org_invite` | boolean | Whether this is an organization invite by link |
| `org_slug` | string | The organization slug (if applicable) |

---

## Onboarding Events

### `onboarding_step_completed`

Fired when a user completes an onboarding step.

**File:** `apps/web/modules/getting-started/[[...step]]/onboarding-view.tsx`

**Route:** `/getting-started` or `/onboarding/getting-started`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `step` | string | The name of the current step |
| `step_index` | number | The index of the current step |
| `from` | string | Where the user came from |
| `was_skipped` | boolean | Whether the step was skipped |

---

### `onboarding_sign_out_clicked`

Fired when a user clicks sign out during onboarding.

**File:** `apps/web/modules/getting-started/[[...step]]/onboarding-view.tsx`

**Route:** `/getting-started` or `/onboarding/getting-started`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `step` | string | The name of the current step |
| `step_index` | number | The index of the current step |

---

### `onboarding_completed`

Fired when a user completes the entire onboarding flow.

**File:** `apps/web/components/getting-started/steps-views/UserProfile.tsx`

**Route:** `/getting-started` or `/onboarding/getting-started`

**Properties:** None

---

### `onboarding_app_connect_clicked`

Fired when a user clicks to connect an app during onboarding.

**File:** `apps/web/components/getting-started/components/AppConnectionItem.tsx`

**Route:** `/getting-started` or `/onboarding/getting-started`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `app_title` | string | The title of the app |
| `app_type` | string | The type of the app |
| `app_slug` | string | The slug of the app |
| `has_dependency` | boolean | Whether the app has a dependency |

---

## Email Verification Events

### `verify_email_already_verified`

Fired when a user lands on the verify email page but is already verified.

**File:** `apps/web/modules/auth/verify-email-view.tsx`

**Route:** `/auth/verify-email`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `onboarding_v3_enabled` | boolean | Whether onboarding v3 feature flag is enabled |

---

### `verify_email_resend_clicked`

Fired when a user clicks to resend the verification email.

**File:** `apps/web/modules/auth/verify-email-view.tsx`

**Route:** `/auth/verify-email`

**Properties:** None

---

## Team Events

### `add_team_button_clicked`

Fired when a user clicks the "Add Team" button.

**File:** `apps/web/app/(use-page-wrapper)/(main-nav)/teams/CTA.tsx`

**Route:** `/teams`

**Properties:** None

---

### `create_team_checkout_clicked`

Fired when a user submits the create team form.

**File:** `packages/features/ee/teams/components/CreateANewTeamForm.tsx`

**Route:** `/settings/teams/new`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `team_name` | string | The name of the team |
| `team_slug` | string | The slug of the team |

---

### `onboard_members_continue_clicked`

Fired when a user clicks continue after adding team members.

**File:** `packages/features/ee/teams/components/AddNewTeamMembers.tsx`

**Route:** `/settings/teams/[teamId]/onboard-members`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `team_id` | number | The ID of the team |
| `is_org` | boolean | Whether this is an organization |
| `members_count` | number | The total number of members |

---

### `teams_add_new_members_button_clicked`

Fired when a user clicks the "Add" button to add new team members.

**File:** `packages/features/ee/teams/components/MemberList.tsx`

**Route:** `/settings/teams/[teamId]/members`

**Properties:** None

---

### `teams_modal_invite_members_button_clicked`

Fired when a user submits the member invitation modal.

**File:** `packages/features/ee/teams/components/MemberInvitationModal.tsx`

**Route:** `/settings/teams/[teamId]/members`

**Properties:** None

---

### `add_organization_member_clicked`

Fired when a user clicks to add an organization member.

**File:** `packages/features/users/components/UserTable/UserListTable.tsx`

**Route:** `/settings/organizations/[orgId]/members`

**Properties:** None

---

## App Store Events

### `app_install_button_clicked`

Fired when a user clicks to install an app.

**File:** `packages/features/apps/components/AppCard.tsx`

**Route:** `/apps` or `/apps/[slug]`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `slug` | string | The app slug |
| `app_type` | string | The type of the app |
| `is_redirect` | boolean | Whether this is a redirect app |
| `is_conferencing` | boolean | Whether this is a conferencing app |

---

### `app_card_details_clicked`

Fired when a user clicks to view app details.

**File:** `packages/features/apps/components/AppCard.tsx`

**Route:** `/apps`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `slug` | string | The app slug |

---

### `event_type_app_switch_toggled`

Fired when a user toggles an app on/off for an event type.

**File:** `packages/app-store/_components/AppCard.tsx`

**Route:** `/event-types/[eventTypeId]`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `app_slug` | string | The app slug |
| `enabled` | boolean | Whether the app was enabled or disabled |

---

## Routing Forms Events

### `new_routing_form_button_clicked`

Fired when a user clicks to create a new routing form.

**File:** `apps/web/app/(use-page-wrapper)/apps/routing-forms/forms/[[...pages]]/Forms.tsx`

**Route:** `/apps/routing-forms/forms`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `teamId` | number | The team ID (if applicable) |

---

## Workflows & Cal.ai Events

### `create_new_workflow_button_clicked`

Fired when a user clicks to create a new workflow.

**File:** `packages/features/ee/workflows/components/WorkflowCreationDialog.tsx`

**Route:** `/workflows`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `teamId` | number | The team ID (if applicable) |

---

### `calai_buy_number_modal_opened`

Fired when a user opens the buy phone number modal for Cal.ai.

**File:** `packages/features/ee/workflows/components/agent-configuration/components/tabs/PhoneNumberTab.tsx`

**Route:** `/workflows/[workflowId]` (Cal.ai agent configuration)

**Properties:** None

---

### `calai_buy_number_button_clicked`

Fired when a user clicks the buy number button in the Cal.ai dialog.

**File:** `packages/features/ee/workflows/components/agent-configuration/components/dialogs/BuyNumberDialog.tsx`

**Route:** `/workflows/[workflowId]` (Cal.ai agent configuration)

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `agentId` | number | The agent ID |
| `workflowId` | number | The workflow ID |
| `teamId` | number | The team ID (if applicable) |

---

### `calai_phone_number_purchased`

Fired when a user successfully purchases a phone number for Cal.ai.

**File:** `packages/features/ee/workflows/components/agent-configuration/components/dialogs/BuyNumberDialog.tsx`

**Route:** `/workflows/[workflowId]` (Cal.ai agent configuration)

**Properties:** None

---

## Insights Events

### `insights_bookings_download_clicked`

Fired when a user downloads bookings data from insights.

**File:** `packages/features/insights/filters/Download/Download.tsx`

**Route:** `/insights`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `teamId` | number | The selected team ID |

---

### `insights_routing_download_clicked`

Fired when a user downloads routing data from insights.

**File:** `packages/features/insights/components/routing/RoutedToPerPeriod.tsx`

**Route:** `/insights/routing`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `teamId` | number | The selected team ID |

---

### `insights_routing_save_filter_clicked`

Fired when a user clicks to save a filter segment in insights.

**File:** `packages/features/data-table/components/segment/SaveFilterSegmentButton.tsx`

**Route:** `/insights/routing`

**Properties:** None

---

## Navigation Events

### `navigation_item_clicked`

Fired when a user clicks a navigation item in the sidebar.

**File:** `packages/features/shell/navigation/NavigationItem.tsx`

**Route:** Any page with navigation

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `item_name` | string | The name of the navigation item |
| `parent_name` | string | The parent navigation item name (if applicable) |

---

### `refer_and_earn_clicked`

Fired when a user clicks the "Refer and Earn" button.

**File:** `packages/features/shell/useBottomNavItems.ts`

**Route:** Any page with bottom navigation

**Properties:** None

---

### `settings_sidebar_button_clicked`

Fired when a user clicks a settings sidebar button.

**File:** `packages/ui/components/navigation/tabs/VerticalTabItem.tsx`

**Route:** `/settings/*`

**Properties:** Dynamic - passed via `trackingMetadata` prop

---

## Tips Events

### `tip_video_clicked`

Fired when a user clicks on a tip video.

**File:** `packages/features/tips/Tips.tsx`

**Route:** Dashboard or pages with tips

**Properties:** The entire tip object is passed as properties

---

### `tip_learn_more_clicked`

Fired when a user clicks "Learn More" on a tip.

**File:** `packages/features/tips/Tips.tsx`

**Route:** Dashboard or pages with tips

**Properties:** The entire tip object is passed as properties

---

### `tip_dismiss_clicked`

Fired when a user dismisses a tip.

**File:** `packages/features/tips/Tips.tsx`

**Route:** Dashboard or pages with tips

**Properties:** The entire tip object is passed as properties

---

## Availability Events

### `team_availability_toggle_clicked`

Fired when a user toggles to view team availability.

**File:** `apps/web/modules/availability/availability-view.tsx`

**Route:** `/availability`

**Properties:** None

---

## Contributing

When adding new PostHog events to the codebase, please update this document with:

1. The event name
2. A description of when it fires
3. The file location
4. The route where it can be triggered
5. All properties sent with the event

This helps maintain visibility into our analytics tracking for the marketing and product teams.
