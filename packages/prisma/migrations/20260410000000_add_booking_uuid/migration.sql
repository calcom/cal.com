-- Add nullable UUID column — no table rewrite, no lock on large tables
ALTER TABLE "Booking" ADD COLUMN "uuid" UUID;
