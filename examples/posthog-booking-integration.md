# PostHog Booking Flow Funnel Analytics

## Overview

This integration adds PostHog funnel analytics and session replay tracking to Cal.com's booking flow for enhanced monitoring, debugging, and conversion optimization. The implementation focuses on tracking the core booking funnel steps and provides session replay capabilities for detailed user behavior analysis.

## Architecture

The PostHog integration consists of:
- **`BookingFunnelTracker`**: Client-side funnel tracking for key booking steps
- **`BookingPostHogProvider`**: React provider with session recording enabled for booking pages
- **Team-based feature flag**: Controls which teams have tracking enabled

## Booking Funnel Steps

The integration tracks 4 key funnel steps to analyze booking conversion:

### 1. `booking_funnel_booking_started`
Triggered when a user initiates a booking request.
**Properties:**
- `bookingUid`: Unique booking identifier (when available)
- `eventTypeId`: Event type identifier
- `userId`: User making the booking
- `teamId`: Team identifier (if applicable)
- `isReschedule`: Whether this is a reschedule operation
- `paymentRequired`: Whether payment is required
- `duration`: Event duration in minutes
- `step`: "booking_started"
- `timestamp`: ISO timestamp

### 2. `booking_funnel_form_filled`
Triggered when the booking form is successfully submitted.
**Properties:**
- `bookingUid`: Booking UID
- `eventTypeId`: Event type identifier
- `userId`: User identifier
- `teamId`: Team identifier
- `isReschedule`: Whether this was a reschedule
- `paymentRequired`: Whether payment was required
- `duration`: Event duration
- `step`: "form_filled"
- `timestamp`: ISO timestamp

### 3. `booking_funnel_payment_initiated`
Triggered when payment processing begins (for paid events only).
**Properties:**
- `bookingUid`: Booking UID
- `eventTypeId`: Event type identifier
- `userId`: User identifier
- `teamId`: Team identifier
- `isReschedule`: Whether this was a reschedule
- `paymentRequired`: Always true for this event
- `duration`: Event duration
- `step`: "payment_initiated"
- `timestamp`: ISO timestamp

### 4. `booking_funnel_booking_completed`
Triggered when the booking is fully completed and confirmed.
**Properties:**
- `bookingUid`: Booking UID
- `eventTypeId`: Event type identifier
- `userId`: User identifier
- `teamId`: Team identifier
- `isReschedule`: Whether this was a reschedule
- `paymentRequired`: Whether payment was required
- `duration`: Event duration
- `step`: "booking_completed"
- `timestamp`: ISO timestamp

## Configuration

### Environment Variables

PostHog tracking is enabled when the following environment variables are set:

```bash
# Required: PostHog project API key
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key_here

# Optional: PostHog host (defaults to US cloud)
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Team Feature Flag

The integration respects the `posthog-booking-tracking` team feature flag. Tracking is only enabled for teams that have this feature flag activated. This allows for:
- Gradual rollout to specific teams
- Cost control by limiting tracking scope
- Testing with select teams before full deployment

### Feature Flag Setup

1. Add the feature flag to your Cal.com instance:
   ```sql
   INSERT INTO "Feature" (slug, enabled, description) 
   VALUES ('posthog-booking-tracking', false, 'Enable PostHog funnel analytics and session replay for booking flows');
   ```

2. Enable for specific teams:
   ```sql
   INSERT INTO "TeamFeatures" ("teamId", "featureId") 
   VALUES (your_team_id, 'posthog-booking-tracking');
   ```

## Session Replay Setup

Session replay is automatically enabled for booking pages when the feature flag is active. This provides detailed user interaction recordings for debugging and optimization.

### Session Replay Features

- **Automatic Recording**: Sessions are recorded on all booking pages for teams with the feature flag enabled
- **Privacy Protection**: Sensitive form data is automatically masked
- **Performance Optimized**: Recording only activates on booking pages to minimize performance impact
- **Team-based Control**: Only teams with the feature flag get session recording

### Accessing Session Replays

1. **Navigate to PostHog**: Go to your PostHog project dashboard
2. **Session Recordings**: Click on "Session recordings" in the left sidebar
3. **Filter by Events**: Filter recordings that contain booking funnel events
4. **Analyze User Behavior**: Watch recordings to understand user interactions and identify issues

### Session Replay Debugging Workflow

1. **Identify Problem Bookings**: Use funnel analysis to find drop-off points
2. **Find Related Sessions**: Filter session recordings by user ID or booking properties
3. **Watch User Journey**: Observe actual user behavior leading to issues
4. **Identify Root Causes**: Spot UI/UX issues, errors, or confusion points
5. **Implement Fixes**: Address identified issues and monitor improvements

## Cost Considerations

### PostHog Pricing Tiers

- **Product Analytics**: 1M events/month free, then $0.00031 per event
- **Session Replay**: 5,000 recordings/month free, then $0.005 per recording

### Event Volume Estimation

**Per Booking Attempt (Complete Funnel):**
- `booking_funnel_booking_started`: 1 event
- `booking_funnel_form_filled`: 1 event (if form completed)
- `booking_funnel_payment_initiated`: 1 event (if payment required)
- `booking_funnel_booking_completed`: 1 event (if successful)

**Total per successful booking**: 3-4 events (much lower than comprehensive tracking)

**Monthly Estimates:**
- 1,000 bookings/month = ~3,000-4,000 events
- 10,000 bookings/month = ~30,000-40,000 events
- 100,000 bookings/month = ~300,000-400,000 events

### Session Replay Volume

**Estimated Recording Volume:**
- Average session length: 5-10 minutes
- Recording rate: ~50% of booking page visits (depends on completion rate)
- 1,000 booking attempts/month = ~500 recordings
- 10,000 booking attempts/month = ~5,000 recordings

### Cost Optimization

1. **Team-based rollout**: Use feature flags to limit tracking to specific teams
2. **Focused tracking**: Only 4 key funnel events vs comprehensive tracking
3. **Session replay sampling**: Consider sampling for very high-volume scenarios
4. **Monitoring**: Set up alerts for unexpected volume spikes

## Funnel Analysis Workflows

### 1. Booking Conversion Funnel Analysis

**Objective**: Understand where users drop off in the booking process

**Steps:**
1. Create a funnel in PostHog with the 4 key steps
2. Identify stages with highest drop-off rates
3. Analyze conversion by team and event type
4. Monitor trends over time

**PostHog Funnel Setup:**
```javascript
// Navigate to PostHog > Insights > Funnels
// Add these steps in order:
1. booking_funnel_booking_started
2. booking_funnel_form_filled  
3. booking_funnel_payment_initiated (for paid events)
4. booking_funnel_booking_completed
```

### 2. Drop-off Point Identification

**Objective**: Find specific points where users abandon bookings

**PostHog Query:**
```javascript
// Events & Actions > Trends
events.where([
  {
    "event": "booking_funnel_booking_started",
    "timestamp": "last 7 days"
  }
]).groupBy("properties.eventTypeId")
.compare([
  "booking_funnel_form_filled",
  "booking_funnel_payment_initiated", 
  "booking_funnel_booking_completed"
])
```

### 3. Session Replay Analysis for Drop-offs

**Objective**: Understand why users drop off at specific funnel steps

**Steps:**
1. **Identify Drop-off Users**: Filter funnel for users who started but didn't complete
2. **Find Session Recordings**: Search recordings by user ID or session properties
3. **Analyze User Behavior**: Watch recordings to see what went wrong
4. **Categorize Issues**: Group issues by type (UI bugs, confusion, errors, etc.)

**Session Replay Filters:**
```javascript
// Session Recordings > Filters
- Events: Contains "booking_funnel_booking_started"
- Events: Does not contain "booking_funnel_booking_completed"
- Duration: > 30 seconds (to filter out immediate bounces)
```

### 4. Performance Impact Analysis

**Objective**: Identify slow booking flows affecting conversion

**Steps:**
1. **Measure Funnel Duration**: Time between booking_started and booking_completed
2. **Identify Slow Bookings**: Find bookings taking longer than expected
3. **Correlate with Drop-offs**: See if slow performance correlates with abandonment
4. **Use Session Replays**: Watch slow booking sessions to identify bottlenecks

### 5. Team and Event Type Performance

**Objective**: Compare booking performance across teams and event types

**PostHog Breakdown:**
```javascript
// Funnel Analysis with Breakdown
- Breakdown by: properties.teamId
- Breakdown by: properties.eventTypeId
- Time period: Last 30 days
- Compare conversion rates across segments
```

## Dashboard Setup

### PostHog Dashboard Configuration

Create a dedicated "Booking Flow Analytics" dashboard with the following widgets:

### 1. Main Booking Funnel
**Widget Type**: Funnel
**Configuration**:
```javascript
Steps:
1. booking_funnel_booking_started
2. booking_funnel_form_filled
3. booking_funnel_payment_initiated (optional step)
4. booking_funnel_booking_completed

Breakdown: properties.teamId
Time Range: Last 30 days
```

### 2. Conversion Rate Trends
**Widget Type**: Trends
**Configuration**:
```javascript
Events: 
- booking_funnel_booking_started (as baseline)
- booking_funnel_booking_completed (as conversion)

Formula: (booking_completed / booking_started) * 100
Breakdown: Daily
Time Range: Last 90 days
```

### 3. Drop-off Analysis by Step
**Widget Type**: Funnel (Step-by-step)
**Configuration**:
```javascript
Show conversion between each step:
- Started → Form Filled
- Form Filled → Payment (for paid events)
- Payment → Completed
- Form Filled → Completed (for free events)
```

### 4. Team Performance Comparison
**Widget Type**: Table
**Configuration**:
```javascript
Rows: properties.teamId
Columns: 
- Total Started
- Total Completed  
- Conversion Rate
- Average Duration (booking_started to booking_completed)
```

### 5. Event Type Performance
**Widget Type**: Bar Chart
**Configuration**:
```javascript
X-axis: properties.eventTypeId
Y-axis: Conversion Rate
Breakdown: properties.paymentRequired
Time Range: Last 30 days
```

### 6. Session Replay Insights
**Widget Type**: Session Recordings List
**Configuration**:
```javascript
Filters:
- Contains event: booking_funnel_booking_started
- Does not contain: booking_funnel_booking_completed
- Duration: > 1 minute

Sort by: Most recent
Limit: 50 recordings
```

### Alert Configuration

Set up alerts for:
- **Conversion Rate Drop**: Overall funnel conversion < 70%
- **Form Abandonment**: Form fill rate < 80%
- **Payment Issues**: Payment completion rate < 90% (for paid events)
- **High Drop-off**: Any single step drop-off > 30%

## Integration with Existing Monitoring

### Complementary Systems

**PostHog** (User Analytics & Session Replay):
- Booking funnel conversion analysis
- User behavior insights through session recordings
- Drop-off point identification
- A/B testing for booking flow optimization

**Axiom** (Technical Logs):
- Detailed error logs and stack traces
- Request/response tracking
- System performance monitoring
- Technical debugging and troubleshooting

### Cross-System Correlation Workflow

Use `bookingUid` to correlate data between PostHog and Axiom:

1. **PostHog Funnel Analysis**: Identify users who dropped off at specific steps
2. **Session Replay Review**: Watch user sessions to understand behavior
3. **Axiom Log Investigation**: Search Axiom logs using `bookingUid` for technical details
4. **Root Cause Analysis**: Combine user behavior insights with technical logs
5. **Issue Resolution**: Fix identified problems and monitor improvements

### Example Correlation Process

```javascript
// 1. PostHog: Find users who started but didn't complete bookings
Funnel: booking_started → NOT booking_completed
Export user IDs and booking UIDs

// 2. PostHog: Watch session replays for these users
Session Recordings filtered by user IDs

// 3. Axiom: Search technical logs
Query: bookingUid:"uid_from_posthog" AND level:error

// 4. Combine insights for complete picture
User behavior (PostHog) + Technical errors (Axiom) = Root cause
```

## Best Practices

### Implementation

1. **Gradual Rollout**: Start with a small team and expand gradually
2. **Monitor Costs**: Track event volume and session recording costs regularly
3. **Error Handling**: Ensure tracking failures don't impact booking flow
4. **Performance**: Tracking should not add significant latency

### Funnel Analysis Best Practices

1. **Focus on Key Metrics**: Track only the 4 essential funnel steps
2. **Regular Review**: Analyze funnel performance weekly
3. **Segment Analysis**: Compare performance across teams and event types
4. **Trend Monitoring**: Watch for changes in conversion rates over time

### Session Replay Best Practices

1. **Privacy Protection**: Sensitive form data is automatically masked
2. **Selective Recording**: Only record booking pages to minimize storage costs
3. **Regular Review**: Watch recordings of drop-off users weekly
4. **Issue Documentation**: Document common issues found in recordings

### Data Quality

1. **Consistent Properties**: Ensure all funnel events include required properties
2. **Timestamp Accuracy**: Use consistent ISO timestamp formats
3. **Property Validation**: Validate event properties before sending
4. **User Context**: Include user and team IDs for proper segmentation

### Privacy and Compliance

1. **PII Handling**: Avoid tracking personally identifiable information in event properties
2. **Session Replay Privacy**: PostHog automatically masks sensitive form inputs
3. **Data Retention**: Configure appropriate data retention policies in PostHog
4. **Team Permissions**: Respect team-based access controls through feature flags
5. **User Consent**: Ensure compliance with privacy regulations (GDPR, CCPA)

## Troubleshooting

### Common Issues

**Funnel Events Not Appearing:**
- Check `NEXT_PUBLIC_POSTHOG_KEY` environment variable
- Verify team has `posthog-booking-tracking` feature flag enabled
- Check PostHog project settings and API key permissions
- Ensure user belongs to a team with the feature flag

**Session Recordings Not Working:**
- Verify PostHog provider is wrapping booking pages
- Check that `enableSessionRecording={true}` is set for booking provider
- Ensure user session has valid team/organization ID
- Check browser console for PostHog initialization errors

**Missing Funnel Steps:**
- Verify all 4 funnel tracking calls are implemented correctly
- Check for JavaScript errors preventing tracking code execution
- Ensure proper event property formatting (bookingUid, eventTypeId, etc.)
- Validate that booking flow reaches all expected steps

**High Costs:**
- Review team feature flag assignments to limit scope
- Check for duplicate event tracking
- Monitor session recording volume and duration
- Consider implementing sampling for high-volume teams

### Debug Mode

Enable PostHog debug mode in development:
```javascript
// In your PostHog configuration
posthog.debug(true); // Shows all events and feature flag checks in console
```

### Validation Checklist

Before deploying to production:
- [ ] Feature flag is properly configured for test team
- [ ] All 4 funnel events are firing correctly in test bookings
- [ ] Session recordings are capturing booking page interactions
- [ ] Event properties include all required fields
- [ ] No JavaScript errors in browser console
- [ ] PostHog dashboard shows expected funnel data

## Migration and Rollback

### Safe Deployment

1. **Feature Flag Control**: Use team feature flags for controlled rollout
2. **Cost Monitoring**: Monitor event volume and session recording costs
3. **Performance Testing**: Ensure no impact on booking flow performance
4. **Gradual Expansion**: Add teams incrementally based on success metrics

### Rollback Procedure

1. **Immediate**: Disable team feature flags for affected teams
2. **Monitor**: Check for reduction in event volume and costs
3. **Investigate**: Review logs and user feedback for issues
4. **Fix and Re-enable**: Address problems and gradually re-enable flags

This integration provides focused funnel analytics and session replay capabilities for Cal.com's booking flow, enabling data-driven optimization while maintaining performance and cost efficiency.
