
insert into "Availability" ("userId", "startTime", "endTime", "days")
select
  id as "userId", 
  CAST(CONCAT(CAST(("startTime") AS text), ' minute')::interval AS time) as "startTime",
  CAST(CONCAT(CAST(("endTime") AS text), ' minute')::interval AS time) as "endTime",
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
    group by users.id
  ) usersWithAvailabilityNumber
where availability_count < 1
