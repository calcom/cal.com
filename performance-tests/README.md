# Cal.com Performance Testing Suite

This directory contains performance tests for Cal.com using k6, a modern load testing tool. The tests are designed to measure and monitor the performance of critical user flows and API endpoints.

## Test Types

### Load Tests
Load tests simulate normal expected traffic to measure system performance under expected load conditions. These tests help establish baseline performance metrics and detect regressions.

### Stress Tests
Stress tests push the system to its limits to identify breaking points and bottlenecks. These tests help determine the maximum capacity of the system and identify areas for optimization.

### Spike Tests
Spike tests simulate sudden traffic surges to evaluate how the system handles rapid increases in load. These tests help ensure the system remains stable during unexpected traffic spikes.

## Directory Structure

```
/performance-tests
├── scripts/                # k6 test scripts
│   ├── booking-flow.js     # Test booking user journey
│   ├── api-endpoints.js    # Test critical API endpoints
│   ├── calendar-operations.js # Test calendar operations
│   └── main.js             # Main test script with all scenarios
├── lib/                    # Shared utilities and helpers
│   ├── auth.js             # Authentication helpers
│   ├── data-generators.js  # Test data generation
│   └── thresholds.js       # Performance thresholds
└── environments/           # Environment-specific configurations
    ├── local.json
    ├── staging.json
    └── production.json
```

## Running Tests Locally

### Prerequisites
- Install k6: https://k6.io/docs/getting-started/installation/
- Set up local development environment for Cal.com

### Steps

1. Seed the database with test data:
   ```
   yarn workspace @calcom/prisma seed-performance-testing
   ```

2. Start the Cal.com server:
   ```
   yarn dev
   ```

3. Run a specific test:
   ```
   k6 run performance-tests/scripts/booking-flow.js
   ```

4. Run all tests with the main script:
   ```
   k6 run performance-tests/scripts/main.js
   ```

5. Run a specific test type:
   ```
   k6 run performance-tests/scripts/main.js --env TEST_TYPE=load
   k6 run performance-tests/scripts/main.js --env TEST_TYPE=stress
   k6 run performance-tests/scripts/main.js --env TEST_TYPE=spike
   ```

6. Run with custom options:
   ```
   k6 run --vus 20 --duration 2m performance-tests/scripts/api-endpoints.js
   ```

## CI/CD Integration

The performance tests are integrated into the CI/CD pipeline using GitHub Actions. The workflow is defined in `.github/workflows/performance-tests.yml` and runs:

- On a weekly schedule (Monday at midnight UTC)
- When manually triggered via workflow_dispatch
- On pull requests that modify critical paths

The workflow runs all three test types (load, stress, spike) and posts the results as a comment on the PR.

## Interpreting Results

### Key Metrics

- **http_req_duration**: Total time for the request (including DNS lookup, TCP connection, TLS handshake)
- **http_req_failed**: Rate of failed requests
- **iterations**: Number of complete iterations of the test script
- **Custom metrics**: Specific metrics defined in the test scripts (e.g., page_load_time, api_response_time)

### Performance Thresholds

The tests define thresholds for acceptable performance:
- p95 response times should be under the defined thresholds
- Error rates should be below 0.1 (10%)

### Baseline Comparison

Test results are compared against the baseline performance metrics:
- Green: Better than baseline
- Yellow: Within 10% of baseline
- Red: Worse than baseline by more than 10%

## Maintenance

- Update test scenarios when new features are added
- Review and adjust thresholds periodically
- Keep test data generators in sync with API changes
- Monitor historical performance trends
