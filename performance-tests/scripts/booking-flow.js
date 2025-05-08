import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

const pageLoadTime = new Trend('page_load_time');
const slotCalculationTime = new Trend('slot_calculation_time');
const bookingCreationTime = new Trend('booking_creation_time');

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    spike_test: {
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
    },
  },
  thresholds: {
    'page_load_time': ['p95<3000'],
    'slot_calculation_time': ['p95<2000'],
    'booking_creation_time': ['p95<4000'],
    'http_req_duration': ['p95<5000'],
    'http_req_failed': ['rate<0.1'],
  },
};

export default function() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  group('Visit booking page', function() {
    const start = new Date();
    const res = http.get(`${baseUrl}/pro/30min`);
    pageLoadTime.add(new Date() - start);
    
    check(res, {
      'booking page loaded': (r) => r.status === 200,
      'contains calendar': (r) => r.body.includes('calendar'),
    });
  });
  
  sleep(1);
  
  group('Load available slots', function() {
    const start = new Date();
    const res = http.get(`${baseUrl}/api/slots?eventTypeId=1&month=2025-05`);
    slotCalculationTime.add(new Date() - start);
    
    check(res, {
      'slots loaded': (r) => r.status === 200,
      'contains slots data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.slots && data.slots.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  sleep(1);
  
  group('Create booking', function() {
    const payload = {
      eventTypeId: 1,
      start: '2025-05-10T10:00:00Z',
      end: '2025-05-10T10:30:00Z',
      name: 'Test User',
      email: 'test@example.com',
    };
    
    const start = new Date();
    const res = http.post(`${baseUrl}/api/bookings`, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    });
    bookingCreationTime.add(new Date() - start);
    
    check(res, {
      'booking created': (r) => r.status === 201 || r.status === 200,
      'contains booking id': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.id;
        } catch (e) {
          return false;
        }
      },
    });
  });
}
