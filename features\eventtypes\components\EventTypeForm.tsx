/**
 * Add OptionalGuestSettings to the event type form
 * This goes in the "Advanced" tab of event type settings
 */

// In the existing EventTypeForm or EventTypeAdvancedTab component,
// add the OptionalGuestSettings component:

import { OptionalGuestSettings } from "./OptionalGuestSettings";

// Inside the form, after other advanced settings:
// <OptionalGuestSettings 
//   teamId={eventType.teamId}
//   isTeamPlan={hasTeamPlan}
//   eventTypeId={eventType.id}
// />
