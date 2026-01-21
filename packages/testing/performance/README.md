# Cal.com Booking Flow Performance Test Suite

This directory contains performance tests for Cal.com's booking flow using [Grafana k6](https://k6.io/). The tests are designed to measure the performance of the booking flow under various load conditions, including high-volume scenarios with tens of thousands of requests per minute.

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed on your machine
- Cal.com running locally or a deployed instance to test against

## Test Structure

The test suite is organized into the following directories:

- `smoke/`: Simple tests with minimal load to verify functionality
- `load/`: Tests that simulate expected normal load (thousands of requests per minute)
- `stress/`: Tests that simulate heavy load to find breaking points (tens of thousands of requests per minute)
- `spike/`: Tests that simulate sudden spikes in traffic (rapid increase to tens of thousands of requests per minute)
- `utils/`: Shared utilities and helper functions

## Running Tests

### Setting the Base URL

By default, tests will run against `http://localhost:3000`. To test against a different environment, set the `BASE_URL` environment variable:

```bash
BASE_URL=https://your-cal-instance.com k6 run tests/performance/smoke/booking.js
```

### Running Smoke Tests

```bash
# Run booking flow smoke test
k6 run tests/performance/smoke/booking.js
```

### Running Load Tests

```bash
# Run booking flow load test (thousands of requests per minute)
k6 run tests/performance/load/booking.js
```

### Running Stress Tests

```bash
# Run booking flow stress test (tens of thousands of requests per minute)
k6 run tests/performance/stress/booking.js
```

### Running Spike Tests

```bash
# Run booking flow spike test (rapid spike to tens of thousands of requests per minute)
k6 run tests/performance/spike/booking.js
```

### Running Tests with Docker Script

You can also run the performance tests using the provided `run-k6-local.sh` script.  
This script automatically detects your operating system (Linux or macOS) and sets up the appropriate Docker flags for running k6 tests.

#### Prerequisites

- Docker installed and running
- Cal.com running locally (default: `http://localhost:3000`)

#### Usage

From the root of the project, run:

```bash
./tests/scripts/run-k6-local.sh
```

You’ll see an interactive menu:

```
Select a test:
  1) smoke
  2) load
  3) stress
  4) spike
  5) all
  0) exit
```

Alternatively, you can run directly from the CLI:

```bash
# Run smoke tests
./tests/scripts/run-k6-local.sh smoke

# Run all tests
./tests/scripts/run-k6-local.sh all
```

#### Customizing

You can override the following environment variables:

```bash
BASE_URL=http://localhost:3000 \
TOKEN=your_token_here \
./tests/scripts/run-k6-local.sh load
```

Supported env vars:  
- `BASE_URL`  
- `TOKEN`  
- `TEST_USER_FREE`  
- `TEST_PASSWORD_FREE`  
- `TEST_USER_PRO`  
- `TEST_PASSWORD_PRO`


## Test Scenarios

The test suite focuses specifically on the booking flow, which is the most critical user journey in Cal.com:

1. **Booking Page View**: Tests the performance of loading and viewing booking pages

## Load Parameters

The tests are configured to handle tens of thousands of requests per minute during peak times:

- **Load Tests**: Up to 2,000 concurrent virtual users
- **Stress Tests**: Up to 4,000 concurrent virtual users
- **Spike Tests**: Rapid spike to 5,000 concurrent virtual users

## Thresholds

Performance thresholds are defined in `utils/config.js` and vary by test type:

- **Smoke Tests**: Strictest thresholds to catch any performance regressions
- **Load Tests**: Moderate thresholds for normal operating conditions
- **Stress Tests**: More lenient thresholds for heavy load conditions
- **Spike Tests**: Most lenient thresholds for sudden traffic spikes

## Environment Variables

The following environment variables can be used to configure the tests:

- `BASE_URL`: Base URL for the application (default: `http://localhost:3000`)
- `TEST_USER_FREE`: Username for free tier testing (default: `free`)
- `TEST_PASSWORD_FREE`: Password for free tier testing (default: `free`)
- `TEST_USER_PRO`: Username for pro tier testing (default: `pro`)
- `TEST_PASSWORD_PRO`: Password for pro tier testing (default: `pro`)

## Adding New Tests

To add a new test:

1. Create a new JS file in the appropriate directory (smoke, load, stress, or spike)
2. Import necessary helpers from `utils/helpers.js`
3. Define test options including VUs, duration, and thresholds
4. Implement the test scenario using k6 and helper functions

