# PostHog Booking Analytics Dashboard

This document provides PostHog queries and dashboard configurations for monitoring and analyzing the Cal.com booking flow. These queries help identify bottlenecks, track conversion rates, and debug issues in the booking process.

## Key Metrics Queries

### 1. Booking Conversion Funnel

Track the complete booking flow from start to completion:

```sql
SELECT 
  event,
  COUNT(*) as count,
  COUNT(*) * 100.0 / LAG(COUNT(*)) OVER (ORDER BY step) as conversion_rate
FROM (
  SELECT 
    event,
    CASE 
      WHEN event = 'booking_started' THEN 1
      WHEN event = 'calendar_event_created' THEN 2
      WHEN event = 'payment_processed' THEN 3
      WHEN event = 'booking_completed' THEN 4
    END as step
  FROM events 
  WHERE event IN ('booking_started', 'calendar_event_created', 'payment_processed', 'booking_completed')
  AND timestamp >= now() - interval 7 day
  AND properties.teamId IS NOT NULL
) 
WHERE step IS NOT NULL
ORDER BY step;
```

### 2. Calendar Integration Success Rate

Monitor calendar integration reliability by provider:

```sql
SELECT 
  JSONExtractString(properties, 'calendarIntegrations') as integration,
  COUNT(CASE WHEN event = 'calendar_event_created' THEN 1 END) as successful,
  COUNT(CASE WHEN event = 'calendar_event_failed' THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN event = 'calendar_event_created' THEN 1 END) * 100.0 / 
    (COUNT(CASE WHEN event = 'calendar_event_created' THEN 1 END) + 
     COUNT(CASE WHEN event = 'calendar_event_failed' THEN 1 END)), 2
  ) as success_rate_percent
FROM events 
WHERE event IN ('calendar_event_created', 'calendar_event_failed')
AND timestamp >= now() - interval 7 day
AND JSONExtractString(properties, 'calendarIntegrations') != ''
GROUP BY integration
ORDER BY success_rate_percent DESC;
```

### 3. Booking Flow Performance Analysis

Identify slow booking flows and performance bottlenecks:

```sql
WITH booking_times AS (
  SELECT 
    JSONExtractString(properties, 'bookingId') as booking_id,
    JSONExtractString(properties, 'eventTypeId') as event_type_id,
    MIN(CASE WHEN event = 'booking_started' THEN timestamp END) as start_time,
    MAX(CASE WHEN event = 'booking_completed' THEN timestamp END) as completion_time
  FROM events 
  WHERE event IN ('booking_started', 'booking_completed')
  AND timestamp >= now() - interval 7 day
  AND JSONExtractString(properties, 'bookingId') != ''
  GROUP BY booking_id, event_type_id
  HAVING start_time IS NOT NULL AND completion_time IS NOT NULL
)
SELECT 
  event_type_id,
  COUNT(*) as completed_bookings,
  ROUND(AVG(dateDiff('second', start_time, completion_time)), 2) as avg_completion_time_seconds,
  ROUND(quantile(0.95)(dateDiff('second', start_time, completion_time)), 2) as p95_completion_time_seconds,
  ROUND(quantile(0.50)(dateDiff('second', start_time, completion_time)), 2) as median_completion_time_seconds
FROM booking_times
GROUP BY event_type_id
ORDER BY avg_completion_time_seconds DESC;
```

### 4. Error Analysis and Debugging

Identify the most common errors in the booking flow:

```sql
SELECT 
  event,
  JSONExtractString(properties, 'error') as error_message,
  JSONExtractString(properties, 'errorCode') as error_code,
  JSONExtractString(properties, 'eventTypeId') as event_type_id,
  COUNT(*) as error_count,
  COUNT(*) * 100.0 / (
    SELECT COUNT(*) FROM events 
    WHERE event LIKE '%_failed' 
    AND timestamp >= now() - interval 7 day
  ) as error_percentage
FROM events 
WHERE event LIKE '%_failed'
AND timestamp >= now() - interval 7 day
GROUP BY event, error_message, error_code, event_type_id
ORDER BY error_count DESC
LIMIT 20;
```

### 5. Webhook Execution Monitoring

Track webhook scheduling and execution success rates:

```sql
SELECT 
  JSONExtractString(properties, 'webhookType') as webhook_type,
  COUNT(CASE WHEN event = 'webhook_scheduled' THEN 1 END) as scheduled,
  COUNT(CASE WHEN event = 'webhook_executed' THEN 1 END) as executed,
  COUNT(CASE WHEN event = 'webhook_failed' THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN event = 'webhook_executed' THEN 1 END) * 100.0 / 
    COUNT(CASE WHEN event = 'webhook_scheduled' THEN 1 END), 2
  ) as execution_success_rate
FROM events 
WHERE event IN ('webhook_scheduled', 'webhook_executed', 'webhook_failed')
AND timestamp >= now() - interval 7 day
AND JSONExtractString(properties, 'webhookType') != ''
GROUP BY webhook_type
ORDER BY execution_success_rate DESC;
```

### 6. Payment Processing Analytics

Monitor payment flow performance and failure rates:

```sql
SELECT 
  JSONExtractString(properties, 'eventTypeId') as event_type_id,
  COUNT(CASE WHEN event = 'payment_processed' THEN 1 END) as successful_payments,
  COUNT(CASE WHEN event = 'booking_started' AND JSONExtractString(properties, 'paymentRequired') = 'true' THEN 1 END) as payment_required_bookings,
  ROUND(
    COUNT(CASE WHEN event = 'payment_processed' THEN 1 END) * 100.0 / 
    COUNT(CASE WHEN event = 'booking_started' AND JSONExtractString(properties, 'paymentRequired') = 'true' THEN 1 END), 2
  ) as payment_success_rate
FROM events 
WHERE (event = 'payment_processed' OR 
       (event = 'booking_started' AND JSONExtractString(properties, 'paymentRequired') = 'true'))
AND timestamp >= now() - interval 7 day
GROUP BY event_type_id
HAVING payment_required_bookings > 0
ORDER BY payment_success_rate DESC;
```

### 7. Team-based Analytics

Analyze booking performance by team (requires team feature flag):

```sql
SELECT 
  JSONExtractString(properties, 'teamId') as team_id,
  COUNT(CASE WHEN event = 'booking_started' THEN 1 END) as bookings_started,
  COUNT(CASE WHEN event = 'booking_completed' THEN 1 END) as bookings_completed,
  COUNT(CASE WHEN event = 'booking_failed' THEN 1 END) as bookings_failed,
  ROUND(
    COUNT(CASE WHEN event = 'booking_completed' THEN 1 END) * 100.0 / 
    COUNT(CASE WHEN event = 'booking_started' THEN 1 END), 2
  ) as completion_rate
FROM events 
WHERE event IN ('booking_started', 'booking_completed', 'booking_failed')
AND timestamp >= now() - interval 7 day
AND JSONExtractString(properties, 'teamId') != ''
GROUP BY team_id
ORDER BY completion_rate DESC;
```

## Dashboard Setup

### Recommended Dashboard Widgets

1. **Booking Funnel Chart**: Use the conversion funnel query as a funnel visualization
2. **Calendar Integration Health**: Display success rates as a bar chart
3. **Performance Trends**: Show booking completion times over time as a line chart
4. **Error Rate Alert**: Set up alerts when error rates exceed 5%
5. **Webhook Monitoring**: Track webhook execution success rates
6. **Payment Analytics**: Monitor payment processing performance

### Alert Configurations

Set up the following alerts for proactive monitoring:

```sql
-- Alert when booking completion rate drops below 85%
SELECT 
  COUNT(CASE WHEN event = 'booking_completed' THEN 1 END) * 100.0 / 
  COUNT(CASE WHEN event = 'booking_started' THEN 1 END) as completion_rate
FROM events 
WHERE event IN ('booking_started', 'booking_completed')
AND timestamp >= now() - interval 1 hour
HAVING completion_rate < 85;

-- Alert when calendar integration failures exceed 10%
SELECT 
  COUNT(CASE WHEN event = 'calendar_event_failed' THEN 1 END) * 100.0 / 
  (COUNT(CASE WHEN event = 'calendar_event_created' THEN 1 END) + 
   COUNT(CASE WHEN event = 'calendar_event_failed' THEN 1 END)) as failure_rate
FROM events 
WHERE event IN ('calendar_event_created', 'calendar_event_failed')
AND timestamp >= now() - interval 1 hour
HAVING failure_rate > 10;

-- Alert when webhook execution rate drops below 90%
SELECT 
  COUNT(CASE WHEN event = 'webhook_executed' THEN 1 END) * 100.0 / 
  COUNT(CASE WHEN event = 'webhook_scheduled' THEN 1 END) as execution_rate
FROM events 
WHERE event IN ('webhook_scheduled', 'webhook_executed')
AND timestamp >= now() - interval 1 hour
HAVING execution_rate < 90;
```

## Usage Notes

- All queries include team-based filtering to respect the feature flag implementation
- Adjust time intervals (`interval 7 day`) based on your monitoring needs
- Use these queries as starting points and customize based on your specific requirements
- Consider setting up automated reports for daily/weekly booking flow health checks
- The `properties` field structure matches the `BookingEventProperties` interface defined in the tracking implementation

## Integration with Existing Monitoring

These PostHog analytics complement the existing Axiom logging system:
- Use PostHog for user behavior analytics and conversion tracking
- Use Axiom for detailed technical logs and debugging
- Cross-reference booking IDs between both systems for comprehensive analysis
