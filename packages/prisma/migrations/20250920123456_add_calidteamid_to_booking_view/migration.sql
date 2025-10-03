DROP VIEW IF EXISTS public."BookingTimeStatusDenormalized";

CREATE VIEW public."BookingTimeStatusDenormalized" AS
SELECT 
    bd."id",
    bd."uid",
    bd."eventTypeId",
    bd."title",
    bd."description",
    bd."startTime",
    bd."endTime",
    bd."createdAt",
    bd."updatedAt",
    bd."location",
    bd."paid",
    bd."status",
    bd."rescheduled",
    bd."userId",
    bd."teamId",
    t.id AS "calIdTeamId",   -- new column
    bd."eventLength",
    bd."eventParentId",
    bd."userEmail",
    bd."userName",
    bd."userUsername",
    bd."ratingFeedback",
    bd."rating",
    bd."noShowHost",
    bd."isTeamBooking",
    CASE
        WHEN bd."rescheduled" IS TRUE THEN 'rescheduled'
        WHEN bd."status" = 'cancelled'::public."BookingStatus" AND bd."rescheduled" IS NULL THEN 'cancelled'
        WHEN bd."endTime" < now() THEN 'completed'
        WHEN bd."endTime" > now() THEN 'uncompleted'
        ELSE NULL
    END as "timeStatus"
FROM public."BookingDenormalized" bd
LEFT JOIN public."CalIdTeam" t ON t.id = bd."teamId";
