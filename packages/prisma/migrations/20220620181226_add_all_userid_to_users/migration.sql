INSERT INTO _user_eventtype ("A", "B")
SELECT id, "userId" from "EventType" 
LEFT JOIN _user_eventtype on ("A" = "EventType".id)
WHERE "A" IS NULL and "userId" IS NOT NULL;