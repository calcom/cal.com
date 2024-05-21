 -- AlterTable
ALTER TABLE "Attendee" ALTER COLUMN "email" DROP NOT NULL;


ALTER TABLE "Attendee"
ADD CONSTRAINT check_email_or_phone
CHECK ("email" IS NOT NULL OR "phoneNumber" IS NOT NULL);
