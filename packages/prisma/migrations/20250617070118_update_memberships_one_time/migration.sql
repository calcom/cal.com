-- @zomars
-- @emrysal 
-- Note: This migration is hitting a lot of rows, so we need to process in batches
DO $$
DECLARE
    batch_size INTEGER := 5000;
    max_id INTEGER;
    current_id INTEGER := 0;
    affected_rows INTEGER;
BEGIN
    -- Get the maximum id we need to process
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM "Membership" WHERE "customRoleId" IS NULL;

    -- Process in batches until we've covered all records
    LOOP
        UPDATE "Membership"
        SET "customRoleId" =
            CASE role
                WHEN 'OWNER' THEN 'owner_role'
                WHEN 'ADMIN' THEN 'admin_role'
                WHEN 'MEMBER' THEN 'member_role'
            END
        WHERE id > current_id
        AND id <= current_id + batch_size
        AND "customRoleId" IS NULL;

        GET DIAGNOSTICS affected_rows = ROW_COUNT;

        EXIT WHEN current_id >= max_id;

        current_id := current_id + batch_size;

        -- Optional: Add a small delay between batches if needed
-- PERFORM pg_sleep(2);
    END LOOP;
END $$;
