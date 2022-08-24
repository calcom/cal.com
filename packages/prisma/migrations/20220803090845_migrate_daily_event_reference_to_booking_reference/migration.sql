UPDATE "BookingReference"
SET "meetingUrl" = "dailyurl", "meetingPassword" = "dailytoken"
FROM "DailyEventReference"
WHERE "DailyEventReference"."bookingId" = "BookingReference"."bookingId" AND "BookingReference"."type" = 'daily_video'
