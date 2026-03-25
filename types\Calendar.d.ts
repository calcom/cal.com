/**
 * Update the Attendee type to include optional field
 */
export interface Attendee {
  email: string;
  name: string;
  timeZone: string;
  language: { translate: TranslateFunction; locale: string };
  /** Whether this attendee is optional (won't block availability) */
  optional?: boolean;
}

export interface Person {
  name?: string;
  email: string;
  timeZone: string;
  language?: { translate: TranslateFunction; locale: string };
  username?: string;
  id?: number;
  /** Whether this person is an optional attendee */
  optional?: boolean;
}
