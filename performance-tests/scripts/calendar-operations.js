import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

const calendarSyncTime = new Trend('calendar_sync_time');
const busyTimeCalculationTime = new Trend('busy_time_calculation');
const eventCreationTime = new Trend('event_creation_time');

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
        { duration: '1m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    spike_test: {
      executor: 'ramping-arrival-rate',
      preAllocatedVUs: 30,
      maxVUs: 60,
      startRate: 1,
      timeUnit: '1s',
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 40 }, // Sudden spike
        { duration: '30s', target: 40 },
        { duration: '20s', target: 5 },
      ],
    },
  },
  thresholds: {
    'calendar_sync_time': ['p95<5000'],
    'busy_time_calculation': ['p95<2000'],
    'event_creation_time': ['p95<3000'],
    'http_req_duration': ['p95<5000'],
    'http_req_failed': ['rate<0.1'],
  },
};

export default function() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  group('Calendar Sync', function() {
    const start = new Date();
    const res = http.get(`${baseUrl}/api/integrations/calendar/sync?userId=1`);
    calendarSyncTime.add(new Date() - start);
    
    check(res, {
      'calendar sync status 200': (r) => r.status === 200,
      'calendar sync data valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.success !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  sleep(1);
  
  group('Busy Time Calculation', function() {
    const start = new Date();
    const res = http.get(`${baseUrl}/api/availability/busy-times?userId=1&dateFrom=2025-05-01&dateTo=2025-05-07`);
    busyTimeCalculationTime.add(new Date() - start);
    
    check(res, {
      'busy times status 200': (r) => r.status === 200,
      'busy times data valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data.busyTimes);
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  sleep(1);
  
  group('Event Creation', function() {
    const payload = {
      userId: 1,
      title: 'Performance Test Event',
      startTime: '2025-05-15T10:00:00Z',
      endTime: '2025-05-15T11:00:00Z',
      attendees: [{ email: 'test@example.com', name: 'Test User' }],
    };
    
    const start = new Date();
    const res = http.post(`${baseUrl}/api/calendar/create-event`, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    });
    eventCreationTime.add(new Date() - start);
    
    check(res, {
      'event creation status 200': (r) => r.status === 200 || r.status === 201,
      'event creation data valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.id || data.eventId;
        } catch (e) {
          return false;
        }
      },
    });
  });
}
