-- CreateType
CREATE TYPE permission_tuple AS (resource TEXT, action TEXT);

-- CreateFunction
CREATE OR REPLACE FUNCTION add_permissions_to_role(
    p_role_id TEXT,
    VARIADIC p_permissions permission_tuple[]
) RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER;
BEGIN
    INSERT INTO "RolePermission" (id, "roleId", resource, action, "createdAt")
    SELECT 
        gen_random_uuid(),
        p_role_id,
        perm.resource,
        perm.action,
        NOW()
    FROM unnest(p_permissions) AS perm
    ON CONFLICT ("roleId", resource, action) DO NOTHING;
    
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;