import { sleep } from 'k6';
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

import { bookingFlowThresholds, apiEndpointThresholds, calendarOperationsThresholds } from '../lib/thresholds.js';
import { generateBookingPayload, generateEventPayload } from '../lib/data-generators.js';
import { login, getRandomUser, getAuthHeaders } from '../lib/auth.js';

const pageLoadTime = new Trend('page_load_time');
const apiResponseTime = new Trend('api_response_time');
const failedRequests = new Rate('failed_requests');
const totalRequests = new Counter('total_requests');

export const options = {
  scenarios: {
    load_test: {
      executor: __ENV.TEST_TYPE === 'load' || !__ENV.TEST_TYPE ? 'ramping-vus' : 'shared-iterations',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'loadTest',
    },
    stress_test: {
      executor: __ENV.TEST_TYPE === 'stress' ? 'ramping-vus' : 'shared-iterations',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'stressTest',
    },
    spike_test: {
      executor: __ENV.TEST_TYPE === 'spike' ? 'ramping-arrival-rate' : 'shared-iterations',
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
      exec: 'spikeTest',
    },
  },
  thresholds: {
    ...bookingFlowThresholds,
    ...apiEndpointThresholds,
    ...calendarOperationsThresholds,
  },
};

export function loadTest() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  group('Booking Flow', function() {
    const pageRes = http.get(`${baseUrl}/pro/30min`);
    pageLoadTime.add(http.page_load_time);
    totalRequests.add(1);
    
    check(pageRes, {
      'booking page loaded': (r) => r.status === 200,
    }) || failedRequests.add(1);
    
    sleep(1);
    
    const slotsRes = http.get(`${baseUrl}/api/slots?eventTypeId=1&month=2025-05`);
    apiResponseTime.add(http.response_time);
    totalRequests.add(1);
    
    check(slotsRes, {
      'slots loaded': (r) => r.status === 200,
    }) || failedRequests.add(1);
    
    sleep(1);
    
    const bookingPayload = generateBookingPayload();
    const bookingRes = http.post(
      `${baseUrl}/api/bookings`, 
      JSON.stringify(bookingPayload),
      { headers: { 'Content-Type': 'application/json' } }
    );
    apiResponseTime.add(http.response_time);
    totalRequests.add(1);
    
    check(bookingRes, {
      'booking created': (r) => r.status === 201 || r.status === 200,
    }) || failedRequests.add(1);
  });
}

export function stressTest() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  group('API Endpoints', function() {
    const availabilityRes = http.get(`${baseUrl}/api/availability?userId=1&eventTypeId=1&date=2025-05-10`);
    apiResponseTime.add(http.response_time);
    totalRequests.add(1);
    
    check(availabilityRes, {
      'availability status 200': (r) => r.status === 200,
    }) || failedRequests.add(1);
    
    sleep(0.5);
    
    const slotsRes = http.get(`${baseUrl}/api/slots?eventTypeId=1&month=2025-05`);
    apiResponseTime.add(http.response_time);
    totalRequests.add(1);
    
    check(slotsRes, {
      'slots status 200': (r) => r.status === 200,
    }) || failedRequests.add(1);
    
    sleep(0.5);
    
    const bookingsRes = http.get(`${baseUrl}/api/bookings?userId=1&status=upcoming`);
    apiResponseTime.add(http.response_time);
    totalRequests.add(1);
    
    check(bookingsRes, {
      'bookings status 200': (r) => r.status === 200,
    }) || failedRequests.add(1);
  });
}

export function spikeTest() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  group('Calendar Operations', function() {
    const syncRes = http.get(`${baseUrl}/api/integrations/calendar/sync?userId=1`);
    apiResponseTime.add(http.response_time);
    totalRequests.add(1);
    
    check(syncRes, {
      'calendar sync status 200': (r) => r.status === 200,
    }) || failedRequests.add(1);
    
    sleep(0.3);
    
    const busyTimesRes = http.get(`${baseUrl}/api/availability/busy-times?userId=1&dateFrom=2025-05-01&dateTo=2025-05-07`);
    apiResponseTime.add(http.response_time);
    totalRequests.add(1);
    
    check(busyTimesRes, {
      'busy times status 200': (r) => r.status === 200,
    }) || failedRequests.add(1);
    
    sleep(0.3);
    
    const eventPayload = generateEventPayload();
    const eventRes = http.post(
      `${baseUrl}/api/calendar/create-event`, 
      JSON.stringify(eventPayload),
      { headers: { 'Content-Type': 'application/json' } }
    );
    apiResponseTime.add(http.response_time);
    totalRequests.add(1);
    
    check(eventRes, {
      'event creation status 200': (r) => r.status === 200 || r.status === 201,
    }) || failedRequests.add(1);
  });
}

export default function() {
  switch(__ENV.TEST_TYPE) {
    case 'stress':
      stressTest();
      break;
    case 'spike':
      spikeTest();
      break;
    default:
      loadTest();
      break;
  }
}
