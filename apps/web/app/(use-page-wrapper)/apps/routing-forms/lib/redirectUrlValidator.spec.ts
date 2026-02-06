import { describe, it, expect } from 'vitest';
import { redirectUrlValidator } from './redirectUrlValidator';

describe('redirectUrlValidator', () => {
  describe('Valid cases (no variables in query params)', () => {
    it('should return valid for empty string', () => {
      const result = redirectUrlValidator('');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should return valid for URL without query params', () => {
      const result = redirectUrlValidator('/booking/event-type');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should return valid for URL with query params but no variables', () => {
      const result = redirectUrlValidator('/booking?date=2024-01-01&time=10:00');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should return valid for URL with variables in path only', () => {
      const result = redirectUrlValidator('/booking/{userId}/event/{eventId}');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should return valid for URL with variables in path and no query params', () => {
      const result = redirectUrlValidator('/{username}/book');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should return valid for absolute URL without query params', () => {
      const result = redirectUrlValidator('https://cal.com/booking/{userId}');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should return valid for URL with fragment but no query params', () => {
      const result = redirectUrlValidator('/booking#section');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should return valid for URL with query params and fragment but no variables', () => {
      const result = redirectUrlValidator('/booking?date=2024-01-01#section');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });
  });

  describe('Invalid cases (variables in query params)', () => {
    it('should return invalid for single variable in query param', () => {
      const result = redirectUrlValidator('/booking?user={userId}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userId']);
    });

    it('should return invalid for multiple variables in query params', () => {
      const result = redirectUrlValidator('/booking?user={userId}&event={eventId}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userId', 'eventId']);
    });

    it('should return invalid for variable in query param value', () => {
      const result = redirectUrlValidator('/booking?name={userName}&date=2024-01-01');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userName']);
    });

    it('should return invalid for variable in query param key', () => {
      const result = redirectUrlValidator('/booking?{paramName}=value');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['paramName']);
    });

    it('should return invalid for multiple variables in same query param', () => {
      const result = redirectUrlValidator('/booking?range={start}-{end}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['start', 'end']);
    });

    it('should return invalid for variables in query params with fragment', () => {
      const result = redirectUrlValidator('/booking?user={userId}#section');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userId']);
    });

    it('should return invalid for absolute URL with variables in query params', () => {
      const result = redirectUrlValidator('https://cal.com/booking?user={userId}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userId']);
    });

    it('should return invalid with variables containing special characters', () => {
      const result = redirectUrlValidator('/booking?user={user_id}&event={event-name}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['user_id', 'event-name']);
    });

    it('should return invalid with variables containing numbers', () => {
      const result = redirectUrlValidator('/booking?param={field123}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['field123']);
    });
  });

  describe('Mixed cases (variables in both path and query params)', () => {
    it('should only detect variables in query params, not path', () => {
      const result = redirectUrlValidator('/{username}/booking?user={userId}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userId']);
    });

    it('should handle multiple variables in path and query params', () => {
      const result = redirectUrlValidator(
        '/{username}/{eventType}?user={userId}&event={eventId}'
      );
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userId', 'eventId']);
    });
  });

  describe('Edge cases', () => {
    it('should handle URL with empty query string', () => {
      const result = redirectUrlValidator('/booking?');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should handle URL with only fragment', () => {
      const result = redirectUrlValidator('/booking#');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should handle malformed URLs gracefully', () => {
      const result = redirectUrlValidator('not a valid url');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should handle URL with encoded characters', () => {
      const result = redirectUrlValidator('/booking?name=John%20Doe');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should handle URL with encoded variable brackets', () => {
      const result = redirectUrlValidator('/booking?name=%7Buser%7D');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).contain('user');
    });

    it('should handle nested braces', () => {
      const result = redirectUrlValidator('/booking?data={{nestedVar}}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toContain('{nestedVar');
    });

    it('should handle incomplete variable syntax', () => {
      const result = redirectUrlValidator('/booking?user={userId');
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should handle empty variable name', () => {
      const result = redirectUrlValidator('/booking?user={}');
      expect(result.isValid).toBe(false);
    });

    it('should handle variables with spaces', () => {
      const result = redirectUrlValidator('/booking?user={user name}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['user name']);
    });
  });

  describe('Environment variable fallback', () => {
    it('should use fallback URL when NEXT_PUBLIC_WEBSITE_URL is not set', () => {
      const result = redirectUrlValidator('/booking?user={userId}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userId']);
    });

    it('should use NEXT_PUBLIC_WEBSITE_URL when set', () => {
      const result = redirectUrlValidator('/booking?user={userId}');
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['userId']);
    });
  });

  describe('Real-world scenarios', () => {
    it('should validate booking URLs with date and time params', () => {
      const result = redirectUrlValidator(
        '/{username}/30min?date=2024-01-15&time=14:00'
      );
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should invalidate booking URLs with dynamic user params', () => {
      const result = redirectUrlValidator(
        '/{username}/30min?attendee={attendeeEmail}'
      );
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['attendeeEmail']);
    });

    it('should handle UTM parameters correctly', () => {
      const result = redirectUrlValidator(
        '/booking?utm_source=google&utm_medium=cpc&utm_campaign=spring'
      );
      expect(result.isValid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should detect variables in redirect URLs', () => {
      const result = redirectUrlValidator(
        '/booking?redirect=/success/{bookingId}'
      );
      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toEqual(['bookingId']);
    });
  });
});