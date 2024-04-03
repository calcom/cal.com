-- Create or replace the function to automatically grant permissions to a user when a table is created.
CREATE OR REPLACE
FUNCTION auto_grant_func()
RETURNS event_trigger AS $$

BEGIN
	GRANT ALL ON ALL TABLES IN SCHEMA public TO REPLACE_ME_WITH_USERNAME;
	GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO REPLACE_ME_WITH_USERNAME;
	GRANT SELECT ON ALL TABLES IN SCHEMA public TO REPLACE_ME_WITH_USERNAME;
	GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO REPLACE_ME_WITH_USERNAME;
END;

$$ LANGUAGE plpgsql;

-- Create event trigger for auto_grant_func
CREATE EVENT TRIGGER auto_grant_trigger
    ON
ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS')
EXECUTE PROCEDURE auto_grant_func();

-- Check if auto_grant_func exists
SELECT
	prosrc
FROM
	pg_proc
WHERE
	proname = 'auto_grant_func';

-- List event triggers
SELECT
	*
FROM
	pg_event_trigger;
