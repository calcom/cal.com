# Round-Robin Partial Loading: Performance Optimization for Large Teams

## Overview

For organizations with large round-robin event types (50+ team members), Cal.com now offers an optional performance optimization called "Partial Loading." This feature significantly reduces page load times and API usage when displaying available time slots to bookers.

## The Challenge

When a booker views availability for a round-robin event, Cal.com needs to check each team member's calendar to determine when they're free. For a team of 250 people, this means making 250+ calendar API calls (to Google Calendar, Microsoft 365, etc.) before showing any available slots. This can result in slow page loads (10+ seconds) and increased risk of hitting calendar API rate limits.

## How Partial Loading Works

Instead of loading all team members' calendars upfront, Partial Loading intelligently selects a subset of team members to check first. The selection is based on your team's existing round-robin weighting and fairness rules.

### Smart Host Selection

The system prioritizes team members who are most "owed" bookings based on your configured weights. For example, if you have weighted round-robin enabled and a team member has received fewer bookings than their weight suggests they should, they'll be prioritized in the initial load. This ensures that partial loading actually reinforces your fairness rules rather than working against them.

For team members with similar booking shortfalls, the system uses a weekly rotation to break ties, ensuring all team members get visibility over time.

### What Bookers See

When partial loading is active, bookers see available time slots from the initially loaded subset of team members. If they don't find a suitable time, they can click "Load more availability" to see slots from additional team members.

The booking page displays a message like: "Showing availability for 50 of 250 team members. Click here to load more availability if you don't see a time that works for you."

## Configuration

Partial loading is configured per event type through the event type metadata. You can set:

- **Enabled**: Whether to use partial loading for this event type
- **Percentage**: What percentage of hosts to load initially (default: 20%)
- **Minimum**: The minimum number of hosts to always load regardless of percentage (default: 10)

For example, with a 250-person round-robin and default settings (20%, minimum 10), the system would load 50 team members initially.

## Key Benefits

**Faster Page Loads**: Initial availability loads in 2-3 seconds instead of 10+ seconds for large teams.

**Reduced API Usage**: Significantly fewer calendar API calls, reducing the risk of hitting Google/Microsoft rate limits.

**Maintained Fairness**: The selection algorithm aligns with your existing round-robin weighting, so team members who should receive more bookings are prioritized in the initial load.

**No Lost Bookings**: Bookers can always load more availability if needed. The booking assignment still uses the full team pool, so fairness is maintained at booking time.

## Important Notes

- Partial loading only affects the availability display, not the booking assignment. When a booking is made, the system still considers all eligible team members for fair assignment.

- At least one team member from each round-robin group is always included in the initial load to ensure availability is shown for all groups.

- Fixed hosts (those marked as required for every booking) are always included regardless of the partial loading settings.

- This feature is opt-in and disabled by default. It's recommended for round-robin events with 50+ team members where page load performance is a concern.

## Technical Details

The partial loading system uses a "booking shortfall" calculation to rank team members. This is computed from your existing booking data without making any calendar API calls, ensuring the ranking itself is fast and efficient.

The weekly rotation seed ensures that over time, all team members get roughly equal visibility in the initial load, preventing any systematic bias in which team members' availability is shown first.
