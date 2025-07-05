# Axiom Queries for Distributed Tracing

This document provides Axiom query examples that leverage the distributed tracing implementation to enhance debugging and monitoring capabilities for Cal.com's booking flow.

## Find All Operations for a Specific Booking Flow

Use this query to trace the complete lifecycle of a specific booking by its trace ID:

```javascript
['cal.com'] 
| where prefix contains "trace:trace_xyz123"
| sort by timestamp asc
| project timestamp, operation=extract("op:([^\"]+)", 1, prefix), message, level
```

**Use Case**: When a user reports an issue with a specific booking, replace `trace_xyz123` with the actual trace ID to see every operation that occurred during that booking flow.

## Identify Failed Calendar Integrations

Find bookings where calendar event creation failed and correlate them back to the original booking:

```javascript
['cal.com'] 
| where prefix contains "op:calendar_event_creation" and level == "error"
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| join (
    ['cal.com'] 
    | where prefix contains trace_id and prefix contains "op:booking_creation"
    | project trace_id, booking_details=message
  ) on trace_id
```

**Use Case**: Identify patterns in calendar integration failures and correlate them with specific booking types or user configurations.

## Monitor End-to-End Booking Performance

Track the complete booking flow performance from creation to final webhook execution:

```javascript
['cal.com'] 
| where prefix contains "op:booking_creation" and message contains "started"
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| join (
    ['cal.com'] 
    | where prefix contains trace_id and (prefix contains "op:webhook_execution" or prefix contains "op:payment_success_processing")
    | summarize max(timestamp) by trace_id
  ) on trace_id
| extend duration = max_timestamp - timestamp
| summarize avg(duration), p95(duration) by bin(timestamp, 1h)
```

**Use Case**: Monitor booking flow performance over time and identify performance degradation or bottlenecks.

## Find Webhook Execution Delays

Identify webhooks that took longer than expected to execute:

```javascript
['cal.com'] 
| where prefix contains "op:webhook_scheduling"
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| join (
    ['cal.com'] 
    | where prefix contains trace_id and prefix contains "op:webhook_execution"
    | project trace_id, execution_time=timestamp
  ) on trace_id
| extend delay = execution_time - timestamp
| where delay > 5m
| project trace_id, scheduled_time=timestamp, execution_time, delay
| order by delay desc
```

**Use Case**: Identify webhook execution delays that might indicate infrastructure issues or rate limiting.

## Track Payment Processing Issues

Monitor payment processing flows and identify failures or delays:

```javascript
['cal.com'] 
| where prefix contains "op:payment_processing" or prefix contains "op:payment_success_processing"
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| extend operation = extract("op:([^\\s]+)", 1, prefix)
| summarize 
    payment_start = min(timestamp),
    payment_end = max(timestamp),
    operations = make_list(operation)
  by trace_id
| extend payment_duration = payment_end - payment_start
| where payment_duration > 30s
| order by payment_duration desc
```

**Use Case**: Identify slow payment processing that might impact user experience.

## Monitor Seated Booking Workflows

Track the complete seated booking flow including reminder scheduling:

```javascript
['cal.com'] 
| where prefix contains "op:handle_seats" or prefix contains "op:schedule_mandatory_reminder"
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| extend operation = extract("op:([^\\s]+)", 1, prefix)
| summarize 
    start_time = min(timestamp),
    end_time = max(timestamp),
    operations = make_list(operation),
    messages = make_list(message)
  by trace_id
| extend total_duration = end_time - start_time
| order by total_duration desc
```

**Use Case**: Monitor seated booking performance and identify issues with reminder scheduling.

## Find Incomplete Booking Flows

Identify booking flows that started but never completed (missing expected operations):

```javascript
let booking_starts = ['cal.com'] 
| where prefix contains "op:booking_creation" and message contains "started"
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| project trace_id, start_time=timestamp;

let booking_completions = ['cal.com'] 
| where prefix contains "op:webhook_execution" or prefix contains "op:booking_confirmation"
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| project trace_id, completion_time=timestamp;

booking_starts
| join kind=leftanti booking_completions on trace_id
| where start_time > ago(1h)
| order by start_time desc
```

**Use Case**: Identify booking flows that started but never completed, indicating potential system issues.

## Monitor Error Rates by Operation Type

Track error rates across different operations in the booking flow:

```javascript
['cal.com'] 
| where prefix contains "distributed-trace"
| extend operation = extract("op:([^\\s]+)", 1, prefix)
| summarize 
    total_operations = count(),
    error_operations = countif(level == "error"),
    error_rate = (countif(level == "error") * 100.0) / count()
  by operation, bin(timestamp, 1h)
| order by timestamp desc, error_rate desc
```

**Use Case**: Monitor the health of different components in the booking flow and identify which operations are most prone to errors.

## Trace Specific User's Booking Issues

Find all booking-related operations for a specific user:

```javascript
['cal.com'] 
| where prefix contains "distributed-trace" and message contains "userId: 12345"
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| extend operation = extract("op:([^\\s]+)", 1, prefix)
| sort by timestamp asc
| project timestamp, trace_id, operation, message, level
```

**Use Case**: When a specific user reports booking issues, trace all their booking-related operations.

## Performance Baseline Monitoring

Establish performance baselines for different booking flow operations:

```javascript
['cal.com'] 
| where prefix contains "distributed-trace"
| extend operation = extract("op:([^\\s]+)", 1, prefix)
| extend trace_id = extract("trace:([^\\s]+)", 1, prefix)
| summarize 
    operation_start = min(timestamp),
    operation_end = max(timestamp)
  by trace_id, operation
| extend operation_duration = operation_end - operation_start
| summarize 
    avg_duration = avg(operation_duration),
    p50_duration = percentile(operation_duration, 50),
    p95_duration = percentile(operation_duration, 95),
    p99_duration = percentile(operation_duration, 99)
  by operation
| order by p95_duration desc
```

**Use Case**: Establish performance baselines and SLAs for different operations in the booking flow.

## Query Tips

1. **Replace Trace IDs**: In the examples above, replace `trace_xyz123` with actual trace IDs from your logs
2. **Time Ranges**: Add time range filters like `| where timestamp > ago(1h)` to focus on recent events
3. **User Context**: Add user ID filters to focus on specific user issues
4. **Event Type Context**: Add event type ID filters to analyze specific booking types
5. **Combine Queries**: Use joins to correlate different aspects of the booking flow

## Integration with Alerts

These queries can be used to create Axiom alerts for:
- High error rates in specific operations
- Booking flows taking longer than expected
- Incomplete booking flows
- Calendar integration failures
- Payment processing delays

By leveraging these queries, you can proactively monitor the booking flow health and quickly identify issues before they impact users.
