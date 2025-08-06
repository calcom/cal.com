export const PrismaClient = jest.fn();
export const Prisma = {
  TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable',
  },
  LogLevel: {
    info: 'info',
    query: 'query',
    warn: 'warn',
    error: 'error',
  },
};

export enum MembershipRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum SchedulingType {
  ROUND_ROBIN = 'ROUND_ROBIN',
  COLLECTIVE = 'COLLECTIVE',
  MANAGED = 'MANAGED',
}

export enum PeriodType {
  UNLIMITED = 'UNLIMITED',
  ROLLING = 'ROLLING',
  ROLLING_WINDOW = 'ROLLING_WINDOW',
  RANGE = 'RANGE',
}

export enum CreationSource {
  API_V1 = 'API_V1',
  API_V2 = 'API_V2',
  WEBAPP = 'WEBAPP',
}

export type Membership = any;
export type EventType = any;
export type User = any;
export type Booking = any;
export type Schedule = any;
export type Availability = any;
export type Credential = any;
export type Team = any;
export type Webhook = any;
export type WorkflowsOnEventTypes = any;
export type SelectedCalendar = any;
export type DestinationCalendar = any;
export type BookingReference = any;
export type Payment = any;
export type App = any;
export type Feature = any;
export type VerificationToken = any;
export type ResetPasswordRequest = any;
export type ReminderMail = any;
export type EventTypeCustomInput = any;
export type DailyEventReference = any;
export type Attendee = any;
export type Profile = any;
export type Host = any;
export type HashedLink = any;
export type CalVideoSettings = any;
export type AIPhoneCallConfiguration = any;
export type EventTypeTranslation = any;

export default {
  PrismaClient,
  Prisma,
  MembershipRole,
  SchedulingType,
  PeriodType,
  CreationSource,
};
