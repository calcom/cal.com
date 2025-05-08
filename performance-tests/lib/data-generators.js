/**
 * Data generators for k6 performance tests
 * Provides functions to generate test data for various scenarios
 */

export function generateFutureDate(daysAhead = 30) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + Math.floor(Math.random() * daysAhead) + 1);
  return futureDate;
}

export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date) {
  return date.toISOString();
}

export function generateBookingPayload(eventTypeId = 1) {
  const startDate = generateFutureDate();
  const endDate = new Date(startDate);
  endDate.setMinutes(startDate.getMinutes() + 30);
  
  return {
    eventTypeId: eventTypeId,
    start: formatDateTime(startDate),
    end: formatDateTime(endDate),
    name: `Test User ${Math.floor(Math.random() * 1000)}`,
    email: `test${Math.floor(Math.random() * 1000)}@example.com`,
    timeZone: 'UTC',
    language: 'en',
    metadata: {},
  };
}

export function generateEventPayload(userId = 1) {
  const startDate = generateFutureDate();
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 1);
  
  return {
    userId: userId,
    title: `Performance Test Event ${Math.floor(Math.random() * 1000)}`,
    startTime: formatDateTime(startDate),
    endTime: formatDateTime(endDate),
    description: 'This is a test event created by k6 performance tests',
    attendees: [
      { email: `attendee${Math.floor(Math.random() * 1000)}@example.com`, name: 'Test Attendee' }
    ],
    location: 'Zoom',
  };
}

export function generateUserPayload() {
  const userId = Math.floor(Math.random() * 10000);
  return {
    name: `Test User ${userId}`,
    email: `testuser${userId}@example.com`,
    password: 'password123',
    username: `testuser${userId}`,
  };
}

export function generateEventTypePayload(userId = 1) {
  const eventTypeId = Math.floor(Math.random() * 10000);
  return {
    userId: userId,
    title: `Test Event Type ${eventTypeId}`,
    slug: `test-event-${eventTypeId}`,
    length: 30,
    description: 'This is a test event type created by k6 performance tests',
  };
}
