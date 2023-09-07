-- View: public.TeamMemberCount

-- DROP VIEW public."TeamMemberCount";

CREATE OR REPLACE VIEW public."TeamMemberCount"
 AS
  SELECT t.id,
    count(*) AS count
   FROM "Membership" m
     LEFT JOIN "Team" t ON t.id = m."teamId"
  WHERE m.accepted = true
  GROUP BY t.id;