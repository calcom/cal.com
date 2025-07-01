# Distributed Tracing Debugging Examples

This document demonstrates how distributed tracing provides concrete benefits over the current request ID system for debugging Cal.com's booking flow.

## Current Limitations with Request IDs

Cal.com currently uses unique request IDs (`nanoid()`) for each API request. While useful for tracking individual requests, this approach has limitations:

- **No Cross-Request Correlation**: Operations spanning multiple requests (booking → webhook → cron execution) cannot be correlated
- **Async Operation Blindness**: Scheduled operations (webhooks, reminders) lose connection to their originating booking context
- **Limited Performance Insights**: Cannot measure end-to-end timing across the entire booking lifecycle
- **Fragmented Debugging**: Related operations appear as isolated events in logs

## Distributed Tracing Solutions

Our distributed tracing implementation addresses these gaps by providing:

1. **Persistent Trace Context**: A single `traceId` follows operations across multiple requests and async executions
2. **Hierarchical Spans**: Child operations maintain parent-child relationships for complete flow visibility
3. **Cross-Component Correlation**: Links booking creation, payment processing, calendar events, and webhook execution
4. **Enhanced Axiom Queries**: Enables powerful correlation queries for debugging and monitoring

## Debugging Scenarios

### Scenario 1: Google Calendar Event Not Created

**Problem**: User reports booking was created but Google Calendar event is missing

**Current Debugging** (Request ID only):
```
[Request ID: abc123] Booking created successfully
[Request ID: def456] EventManager.create called (different request)
[Request ID: ghi789] Google Calendar API error (separate request)
```
❌ Cannot correlate these three operations - requires manual investigation across multiple request logs

**With Distributed Tracing**:
```
[trace:trace_xyz123 span:span_001 op:booking_creation] Booking creation started
[trace:trace_xyz123 span:span_002 op:calendar_event_creation] EventManager.create started
[trace:trace_xyz123 span:span_002 op:calendar_event_creation] Google Calendar API error: Rate limit exceeded
[trace:trace_xyz123 span:span_003 op:webhook_scheduling] Scheduling BOOKING_CREATED webhook
[trace:trace_xyz123 span:span_004 op:webhook_execution] Webhook executed 5 minutes later
```
✅ Clear correlation shows calendar failure but webhook still fired - immediate root cause identification

### Scenario 2: Payment Processing Delays

**Problem**: Booking confirmed but payment webhook significantly delayed

**Current Debugging**:
```
[Request ID: abc123] Booking created
[Request ID: def456] Payment webhook received (30 minutes later)
```
❌ No way to correlate timing or identify bottlenecks in the payment flow

**With Distributed Tracing**:
```
[trace:trace_abc789 span:span_001 op:booking_creation] Booking created, payment required
[trace:trace_abc789 span:span_002 op:payment_processing] Payment initiated with Stripe
[trace:trace_abc789 span:span_003 op:payment_success_processing] Payment success after 28 minutes
[trace:trace_abc789 span:span_004 op:booking_confirmation] Booking confirmed
```
✅ Shows exact timing and identifies payment processing as bottleneck

### Scenario 3: Webhook Execution Failures

**Problem**: Booking created successfully but webhook subscribers not notified

**Current Debugging**:
```
[Request ID: abc123] Booking created
[Request ID: def456] Webhook scheduled
[Request ID: ghi789] Webhook execution failed (hours later)
```
❌ Difficult to trace which booking triggered the failed webhook

**With Distributed Tracing**:
```
[trace:trace_def456 span:span_001 op:booking_creation] Booking created for eventTypeId: 123
[trace:trace_def456 span:span_002 op:webhook_scheduling] Scheduling webhook for BOOKING_CREATED
[trace:trace_def456 span:span_003 op:webhook_execution] Webhook execution failed: Connection timeout
[trace:trace_def456 span:span_003 op:webhook_execution] Retry attempt 1 failed
[trace:trace_def456 span:span_003 op:webhook_execution] Retry attempt 2 succeeded
```
✅ Complete webhook lifecycle visibility with retry tracking

### Scenario 4: Seated Booking Workflow Issues

**Problem**: Multi-attendee booking partially fails - some attendees get confirmations, others don't

**Current Debugging**:
```
[Request ID: abc123] Seated booking created
[Request ID: def456] Workflow reminder scheduled
[Request ID: ghi789] Email sent to attendee 1
[Request ID: jkl012] Email failed for attendee 2
```
❌ Cannot determine which booking triggered which workflow or email

**With Distributed Tracing**:
```
[trace:trace_mno345 span:span_001 op:booking_creation] Booking created for eventTypeId: 456
[trace:trace_mno345 span:span_002 op:handle_seats] Processing seated booking
[trace:trace_mno345 span:span_003 op:schedule_mandatory_reminder] Scheduling reminders for 3 attendees
[trace:trace_mno345 span:span_004 op:schedule_mandatory_reminder] Email sent to attendee 1: success
[trace:trace_mno345 span:span_004 op:schedule_mandatory_reminder] Email sent to attendee 2: failed (invalid email)
[trace:trace_mno345 span:span_004 op:schedule_mandatory_reminder] Email sent to attendee 3: success
```
✅ Clear visibility into which specific attendee emails failed and why

### Scenario 5: Performance Monitoring

**Problem**: Booking flow occasionally slow but unclear where bottlenecks occur

**Current Debugging**:
```
[Request ID: abc123] Booking request received
[Request ID: abc123] Booking completed (5 seconds later)
```
❌ No visibility into which step took the most time

**With Distributed Tracing**:
```
[trace:trace_pqr678 span:span_001 op:booking_creation] Booking creation started
[trace:trace_pqr678 span:span_002 op:calendar_event_creation] EventManager.create: 200ms
[trace:trace_pqr678 span:span_003 op:payment_processing] Payment processing: 4.2s
[trace:trace_pqr678 span:span_004 op:webhook_scheduling] Webhook scheduling: 50ms
[trace:trace_pqr678 span:span_005 op:schedule_mandatory_reminder] Reminder scheduling: 100ms
```
✅ Identifies payment processing as the performance bottleneck

## Axiom Query Examples

With distributed tracing, you can create powerful Axiom queries for monitoring and debugging:

### Find All Operations for a Specific Booking Flow
```javascript
['cal.com'] 
| where prefix contains "trace:trace_xyz123"
| sort by timestamp asc
| project timestamp, operation=extract("op:([^\"]+)", 1, prefix), message, level
```

### Identify Failed Calendar Integrations
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

### Monitor End-to-End Booking Performance
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

## Implementation Benefits

1. **Faster Debugging**: Immediately correlate related operations across the entire booking lifecycle
2. **Proactive Monitoring**: Identify patterns and bottlenecks before they become user-facing issues
3. **Better Observability**: Complete visibility into async operations and their relationships
4. **Enhanced Support**: Customer support can quickly trace issues using booking IDs or trace IDs
5. **Performance Optimization**: Data-driven insights into which components need optimization

## Migration Strategy

The distributed tracing implementation is designed to be:
- **Backward Compatible**: Existing request ID logging continues to work
- **Opt-in**: Trace context is optional - operations work without it
- **Non-intrusive**: Minimal performance overhead
- **Axiom-friendly**: Integrates seamlessly with existing logging infrastructure

This approach provides immediate value while maintaining system stability and existing workflows.
