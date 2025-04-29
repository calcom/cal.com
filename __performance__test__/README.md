# Cal.com Performance Tests for Large Organizations

This directory contains performance tests designed to measure page load times for various pages within the Cal.com application when dealing with large organizations (Deel-sized).

## How to Run Tests

1. Run the performance tests:
   ```bash
   yarn performance-test
   ```

2. View the results in the `performance-reports` directory.

## Understanding the Results

The tests generate a JSON report with performance metrics for each page, including:

- page-load-time: The time it takes for the page to reach "networkidle" state
- LCP (Largest Contentful Paint): Time for the largest content element to render
- FID (First Input Delay): Time from first user interaction to browser response
- CLS (Cumulative Layout Shift): Measures visual stability
- TTFB (Time to First Byte): Time until the first byte of response is received
- FCP (First Contentful Paint): Time until first content is rendered

## Customizing Tests

You can modify the following parameters in the `seedLargeOrganization` function:

- userCount: Number of users in the organization
- teamsCount: Number of teams in the organization
- eventTypesPerUser: Number of event types per user
- bookingsPerEventType: Number of bookings per event type
