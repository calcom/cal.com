
insert into "Availability" ("userId", "startTime", "endTime", "days")
select
  id as "userId", 
  CAST(CONCAT(CAST(("startTime" / 60) AS text), ':00') AS time) AT TIME ZONE "timeZone" AT TIME ZONE 'UTC',
  CAST(CONCAT(CAST(("endTime" / 60) AS text), ':00') AS time) AT TIME ZONE "timeZone" AT TIME ZONE 'UTC',
  ARRAY [0,1,2,3,4,5,6]
from 
  (
    select 
      users.id, 
      users."startTime", 
      users."endTime", 
      users."timeZone",
      count("Availability".id) as availability_count
    from users 
    left join "Availability" on "Availability"."userId" = users.id
    where users."timeZone" != ''
    group by users.id
  ) usersWithAvailabilityNumber
where availability_count < 1