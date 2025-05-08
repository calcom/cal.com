/**
 * Performance thresholds for k6 tests
 * These thresholds define acceptable performance levels
 */

export const commonThresholds = {
  'http_req_duration': ['p95<5000'], // 95% of requests should be under 5s
  'http_req_failed': ['rate<0.1'],   // Less than 10% failure rate
};

export const bookingFlowThresholds = {
  ...commonThresholds,
  'page_load_time': ['p95<3000'],         // 95% of page loads under 3s
  'slot_calculation_time': ['p95<2000'],  // 95% of slot calculations under 2s
  'booking_creation_time': ['p95<4000'],  // 95% of booking creations under 4s
};

export const apiEndpointThresholds = {
  ...commonThresholds,
  'availability_api_time': ['p95<1000'],  // 95% of availability API calls under 1s
  'slots_api_time': ['p95<1500'],         // 95% of slots API calls under 1.5s
  'bookings_api_time': ['p95<2000'],      // 95% of bookings API calls under 2s
};

export const calendarOperationsThresholds = {
  ...commonThresholds,
  'calendar_sync_time': ['p95<5000'],     // 95% of calendar syncs under 5s
  'busy_time_calculation': ['p95<2000'],  // 95% of busy time calculations under 2s
  'event_creation_time': ['p95<3000'],    // 95% of event creations under 3s
};

export const loadTestScenario = {
  executor: 'ramping-vus',
  startVUs: 1,
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  gracefulRampDown: '30s',
};

export const stressTestScenario = {
  executor: 'ramping-vus',
  startVUs: 5,
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  gracefulRampDown: '30s',
};

export const spikeTestScenario = {
  executor: 'ramping-arrival-rate',
  preAllocatedVUs: 50,
  maxVUs: 100,
  startRate: 5,
  timeUnit: '1s',
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 50 }, // Sudden spike
    { duration: '30s', target: 50 },
    { duration: '20s', target: 5 },
  ],
};
