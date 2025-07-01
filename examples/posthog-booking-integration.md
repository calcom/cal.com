# PostHog Booking Flow Integration

## Overview

This integration adds comprehensive PostHog event tracking to Cal.com's booking flow for enhanced monitoring, debugging, and analytics. The implementation provides detailed insights into booking performance, identifies bottlenecks, and enables proactive issue resolution through real-time event tracking.

## Architecture

The PostHog integration consists of two main tracking classes:
- **`PostHogBookingTracker`**: Client-side tracking for browser-based events
- **`ServerPostHogBookingTracker`**: Server-side tracking for backend operations

Both classes implement team-based feature flag checking to ensure tracking is only enabled for teams with the `posthog-booking-tracking` feature flag.

## Events Tracked

### Core Booking Events

#### `booking_started`
Triggered when a booking request is initiated.
**Properties:**
- `eventTypeId`: Event type identifier
- `userId`: User making the booking
- `teamId`: Team identifier (if applicable)
- `isReschedule`: Whether this is a reschedule operation
- `isTeamEvent`: Whether this is a team event
- `paymentRequired`: Whether payment is required
- `duration`: Event duration in minutes

#### `booking_completed`
Triggered when a booking is successfully created and all operations complete.
**Properties:**
- `bookingId`: Unique booking identifier
- `bookingUid`: Booking UID
- `eventTypeId`: Event type identifier
- `userId`: User identifier
- `teamId`: Team identifier
- `isReschedule`: Whether this was a reschedule
- `isTeamEvent`: Whether this was a team event
- `paymentRequired`: Whether payment was required
- `duration`: Event duration

#### `booking_failed`
Triggered when booking creation fails at any stage.
**Properties:**
- `eventTypeId`: Event type identifier
- `userId`: User identifier
- `teamId`: Team identifier
- `isReschedule`: Whether this was a reschedule attempt
- `isTeamEvent`: Whether this was a team event
- `paymentRequired`: Whether payment was required
- `error`: Error message
- `errorCode`: Error code (if available)

### Calendar Integration Events

#### `calendar_event_created`
Triggered when calendar events are successfully created across integrations.
**Properties:**
- `eventTypeId`: Event type identifier
- `userId`: User identifier
- `calendarIntegrations`: Array of calendar integration types used

#### `calendar_event_failed`
Triggered when calendar event creation fails.
**Properties:**
- `eventTypeId`: Event type identifier
- `userId`: User identifier
- `calendarIntegrations`: Array of calendar integration types attempted
- `error`: Error message
- `errorCode`: Error code (if available)

### Payment Events

#### `payment_processed`
Triggered when payment is successfully processed.
**Properties:**
- `bookingId`: Booking identifier
- `bookingUid`: Booking UID
- `paymentId`: Payment identifier
- `eventTypeId`: Event type identifier
- `userId`: User identifier
- `paymentRequired`: Always true for this event

### Webhook Events

#### `webhook_scheduled`
Triggered when webhooks are scheduled for execution.
**Properties:**
- `bookingId`: Associated booking identifier
- `webhookType`: Type of webhook trigger event

#### `webhook_executed`
Triggered when webhooks are successfully executed.
**Properties:**
- `bookingId`: Associated booking identifier
- `webhookType`: Type of webhook that was executed

#### `webhook_failed`
Triggered when webhook execution fails.
**Properties:**
- `bookingId`: Associated booking identifier
- `webhookType`: Type of webhook that failed
- `error`: Error message
- `errorCode`: Error code (if available)

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
   VALUES ('posthog-booking-tracking', false, 'Enable PostHog event tracking for booking flows');
   ```

2. Enable for specific teams:
   ```sql
   INSERT INTO "TeamFeatures" ("teamId", "featureId") 
   VALUES (your_team_id, 'posthog-booking-tracking');
   ```

## Cost Considerations

### PostHog Pricing Tiers

- **Free Tier**: 1M events/month
- **Paid Tiers**: $0.00031 per event after free tier

### Event Volume Estimation

**Per Successful Booking:**
- `booking_started`: 1 event
- `calendar_event_created`: 1-3 events (depending on integrations)
- `payment_processed`: 0-1 events (if payment required)
- `webhook_scheduled`: 0-5 events (depending on webhook configuration)
- `webhook_executed`: 0-5 events
- `booking_completed`: 1 event

**Total per booking**: 3-16 events (average: 6-8 events)

**Monthly Estimates:**
- 1,000 bookings/month = ~6,000-8,000 events
- 10,000 bookings/month = ~60,000-80,000 events
- 100,000 bookings/month = ~600,000-800,000 events

### Cost Optimization

1. **Team-based rollout**: Use feature flags to limit tracking to specific teams
2. **Event filtering**: Consider tracking only critical events for high-volume instances
3. **Sampling**: Implement sampling for very high-volume scenarios
4. **Monitoring**: Set up alerts for unexpected event volume spikes

## Debugging Workflows

### 1. Booking Failure Analysis

**Objective**: Identify patterns in booking failures

**Steps:**
1. Filter events by `booking_failed`
2. Group by `error` and `errorCode`
3. Analyze failure rates by `eventTypeId` and `teamId`
4. Cross-reference with calendar integration failures

**PostHog Query:**
```sql
SELECT 
  properties.error,
  properties.errorCode,
  properties.eventTypeId,
  COUNT(*) as failure_count
FROM events 
WHERE event = 'booking_failed'
AND timestamp >= now() - interval 24 hour
GROUP BY properties.error, properties.errorCode, properties.eventTypeId
ORDER BY failure_count DESC;
```

### 2. Calendar Integration Issues

**Objective**: Identify problematic calendar integrations

**Steps:**
1. Compare `calendar_event_created` vs `calendar_event_failed` events
2. Analyze failure rates by integration type
3. Identify specific error patterns
4. Monitor integration performance over time

### 3. Performance Bottleneck Identification

**Objective**: Find slow booking flows

**Steps:**
1. Track time between `booking_started` and `booking_completed`
2. Identify outliers with long completion times
3. Analyze by event type and team
4. Correlate with calendar and payment processing times

### 4. Conversion Funnel Analysis

**Objective**: Understand booking drop-off points

**Steps:**
1. Create funnel from `booking_started` to `booking_completed`
2. Identify stages with highest drop-off rates
3. Analyze conversion by team and event type
4. Monitor trends over time

### 5. Webhook Reliability Monitoring

**Objective**: Ensure webhook delivery reliability

**Steps:**
1. Compare `webhook_scheduled` vs `webhook_executed` events
2. Identify webhooks with low execution rates
3. Analyze failure patterns by webhook type
4. Monitor execution delays

## Dashboard Setup

### Quick Start

1. **Import Analytics Queries**: Use the queries from `posthog-booking-analytics.md`
2. **Create Dashboard**: Set up a dedicated booking flow dashboard
3. **Configure Alerts**: Set up alerts for critical metrics
4. **Team Views**: Create team-specific dashboard views

### Recommended Dashboard Widgets

1. **Booking Conversion Funnel**
   - Visualization: Funnel chart
   - Metric: Conversion rate from start to completion

2. **Real-time Booking Activity**
   - Visualization: Line chart
   - Metric: Bookings started/completed over time

3. **Error Rate Monitor**
   - Visualization: Single stat with alert
   - Metric: Percentage of failed bookings

4. **Calendar Integration Health**
   - Visualization: Bar chart
   - Metric: Success rate by integration type

5. **Performance Metrics**
   - Visualization: Histogram
   - Metric: Booking completion time distribution

6. **Webhook Execution Status**
   - Visualization: Table
   - Metric: Execution success rate by webhook type

### Alert Configuration

Set up alerts for:
- Booking failure rate > 5%
- Calendar integration failure rate > 10%
- Webhook execution rate < 90%
- Average booking completion time > 30 seconds

## Integration with Existing Monitoring

### Complementary Systems

**PostHog** (User Analytics):
- User behavior tracking
- Conversion funnel analysis
- Performance metrics
- Business intelligence

**Axiom** (Technical Logs):
- Detailed error logs
- Request/response tracking
- System performance monitoring
- Technical debugging

### Cross-System Correlation

Use `bookingId` and `bookingUid` to correlate events between PostHog and Axiom:

1. **PostHog**: Identify problematic booking patterns
2. **Axiom**: Deep-dive into technical details using booking IDs
3. **Combined Analysis**: Full picture of user experience and technical performance

## Best Practices

### Implementation

1. **Gradual Rollout**: Start with a small team and expand gradually
2. **Monitor Costs**: Track event volume and costs regularly
3. **Error Handling**: Ensure tracking failures don't impact booking flow
4. **Performance**: Tracking should not add significant latency

### Data Quality

1. **Consistent Properties**: Ensure all events include required properties
2. **Error Context**: Include meaningful error messages and codes
3. **Timestamp Accuracy**: Use consistent timestamp formats
4. **Data Validation**: Validate event properties before sending

### Privacy and Compliance

1. **PII Handling**: Avoid tracking personally identifiable information
2. **Data Retention**: Configure appropriate data retention policies
3. **User Consent**: Ensure compliance with privacy regulations
4. **Team Permissions**: Respect team-based access controls

## Troubleshooting

### Common Issues

**Events Not Appearing:**
- Check `NEXT_PUBLIC_POSTHOG_KEY` environment variable
- Verify team has `posthog-booking-tracking` feature flag
- Check PostHog project settings and API key permissions

**High Event Volume:**
- Review team feature flag assignments
- Check for event duplication
- Monitor for infinite loops in tracking code

**Missing Event Properties:**
- Verify property names match interface definitions
- Check for null/undefined values
- Ensure proper error handling in tracking code

### Debug Mode

Enable debug logging by setting the log level to debug in your PostHog tracking implementation. This will log all tracking attempts and feature flag checks.

## Migration and Rollback

### Safe Deployment

1. **Feature Flag Control**: Use team feature flags for controlled rollout
2. **Monitoring**: Monitor event volume and costs during rollout
3. **Rollback Plan**: Disable feature flags if issues arise
4. **Gradual Expansion**: Add teams incrementally

### Rollback Procedure

1. Disable team feature flags for affected teams
2. Monitor for reduction in event volume
3. Investigate and fix issues
4. Re-enable flags after validation

This integration provides comprehensive visibility into Cal.com's booking flow while maintaining performance and respecting team-based access controls.
