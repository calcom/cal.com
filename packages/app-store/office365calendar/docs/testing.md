# Outlook Cache Implementation Testing Guide

This guide will help you verify that the Outlook cache implementation is working correctly in a real environment.

## Prerequisites

1. A working Cal.com instance with Outlook calendar integration
2. An Outlook account with calendar events
3. Access to the application logs
4. Database access to check cache entries

## Testing Steps

### 1. Initial Setup

1. Connect an Outlook calendar to Cal.com
2. Verify that the calendar is properly connected and events are visible
3. Check the database for initial cache entries:
```sql
SELECT * FROM "CalendarAvailabilityCache" 
WHERE "userId" = <your_user_id> 
ORDER BY "date" DESC 
LIMIT 5;
```

### 2. Cache Population Test

1. Visit the booking page for your calendar
2. Check the application logs for cache-related messages
3. Verify that cache entries are created:
```sql
SELECT COUNT(*) FROM "CalendarAvailabilityCache" 
WHERE "userId" = <your_user_id>;
```

### 3. Cache Hit Test

1. Visit the booking page again
2. Check the application logs for "Cache hit" messages
3. Verify that the page loads faster than the first visit
4. Check the database for cache updates:
```sql
SELECT "lastUpdated" FROM "CalendarAvailabilityCache" 
WHERE "userId" = <your_user_id> 
ORDER BY "lastUpdated" DESC 
LIMIT 1;
```

### 4. Webhook Test

1. Create a new event in your Outlook calendar
2. Wait for the webhook notification (check logs)
3. Verify that the cache is invalidated:
```sql
SELECT "lastUpdated" FROM "CalendarAvailabilityCache" 
WHERE "userId" = <your_user_id> 
AND "date" = CURRENT_DATE;
```
4. Visit the booking page and verify that the new event is reflected

### 5. Cache Staleness Test

1. Wait for more than 1 hour
2. Visit the booking page
3. Check the logs for cache staleness messages
4. Verify that the cache is refreshed:
```sql
SELECT "lastUpdated" FROM "CalendarAvailabilityCache" 
WHERE "userId" = <your_user_id> 
ORDER BY "lastUpdated" DESC 
LIMIT 1;
```

### 6. Subscription Management Test

1. Check the current subscription:
```sql
SELECT "subscriptionId" FROM "CalendarAvailabilityCache" 
WHERE "userId" = <your_user_id> 
LIMIT 1;
```

2. Wait for 3 days (subscription expiration)
3. Visit the booking page
4. Verify that the subscription is renewed:
```sql
SELECT "subscriptionId" FROM "CalendarAvailabilityCache" 
WHERE "userId" = <your_user_id> 
LIMIT 1;
```

### 7. Error Handling Test

1. Temporarily disable the webhook endpoint
2. Make changes to your Outlook calendar
3. Re-enable the webhook endpoint
4. Verify that the cache is eventually updated
5. Check the logs for error messages and recovery

### 8. Performance Test

1. Create multiple events in your Outlook calendar
2. Measure the page load time for the booking page
3. Compare with the load time before the cache implementation
4. Verify that subsequent visits are faster

## Expected Results

1. **Cache Population**
   - Cache entries should be created for each day
   - Each entry should contain availability slots

2. **Cache Hits**
   - Subsequent visits should be faster
   - Logs should show cache hit messages

3. **Webhook Processing**
   - Changes should be reflected within minutes
   - Cache should be invalidated and updated

4. **Subscription Management**
   - Subscriptions should be created and renewed
   - No calendar sync issues should occur

5. **Error Handling**
   - System should recover from temporary failures
   - Cache should eventually become consistent

6. **Performance**
   - Page load times should be significantly faster
   - API calls to Microsoft Graph should be reduced

## Troubleshooting

If you encounter issues:

1. Check the application logs for error messages
2. Verify the webhook endpoint is accessible
3. Check subscription status in the database
4. Verify Microsoft Graph API permissions
5. Check cache staleness and invalidation

## Monitoring

Set up monitoring for:

1. Cache hit/miss rates
2. Webhook delivery success
3. Subscription health
4. Page load times
5. API call frequency

## Rollback Plan

If issues are found:

1. Disable the cache in the configuration
2. Remove cache entries from the database
3. Revert to the previous implementation
4. Monitor system performance 