-- Set BookingStatus.PENDING
UPDATE "Booking" SET "status" = 'pending' WHERE "confirmed" = false AND "rejected" = false AND "rescheduled" IS NOT true;

-- Set BookingStatus.REJECTED
UPDATE "Booking" SET "status" = 'rejected' WHERE "confirmed" = false AND "rejected" = true AND "rescheduled" IS NOT true;

-- Set BookingStatus.CANCELLED
UPDATE "Booking" SET "status" = 'cancelled' WHERE "confirmed" = false AND "rejected" = false AND "rescheduled" IS true;

-- Set BookingStatus.ACCEPTED
UPDATE "Booking" SET "status" = 'accepted' WHERE "confirmed" = true AND "rejected" = false AND "rescheduled" IS NOT true;
