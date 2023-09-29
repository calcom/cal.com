UPDATE "BookingReference"
SET "meetingUrl" = TRIM("dailyurl", "meetingPassword") = "dailytoken"
FROM "DailyEventReference"
WHERE "DailyEventReference"."bookingId" = "BookingReference"."bookingId" AND "BookingReference"."type" = 'daily_video'
