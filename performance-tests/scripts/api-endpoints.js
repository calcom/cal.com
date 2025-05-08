import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

const availabilityTime = new Trend('availability_api_time');
const slotsTime = new Trend('slots_api_time');
const bookingsTime = new Trend('bookings_api_time');

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
    },
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { duration: '1m', target: 30 },
        { duration: '2m', target: 60 },
        { duration: '1m', target: 0 },
      ],
    },
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 80 }, // Sudden spike
        { duration: '30s', target: 80 },
        { duration: '20s', target: 5 },
      ],
    },
  },
  thresholds: {
    'availability_api_time': ['p95<1000'],
    'slots_api_time': ['p95<1500'],
    'bookings_api_time': ['p95<2000'],
    'http_req_duration': ['p95<3000'],
    'http_req_failed': ['rate<0.1'],
  },
};

export default function() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  group('Availability API', function() {
    const start = new Date();
    const res = http.get(`${baseUrl}/api/availability?userId=1&eventTypeId=1&date=2025-05-10`);
    availabilityTime.add(new Date() - start);
    
    check(res, {
      'availability status 200': (r) => r.status === 200,
      'availability data valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.busy !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  sleep(1);
  
  group('Slots API', function() {
    const start = new Date();
    const res = http.get(`${baseUrl}/api/slots?eventTypeId=1&month=2025-05`);
    slotsTime.add(new Date() - start);
    
    check(res, {
      'slots status 200': (r) => r.status === 200,
      'slots data valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data.slots);
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  sleep(1);
  
  group('Bookings API', function() {
    const start = new Date();
    const res = http.get(`${baseUrl}/api/bookings?userId=1&status=upcoming`);
    bookingsTime.add(new Date() - start);
    
    check(res, {
      'bookings status 200': (r) => r.status === 200,
      'bookings data valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data.bookings);
        } catch (e) {
          return false;
        }
      },
    });
  });
}
