-- Analyze table sizes
SELECT 
    'EventType' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('"EventType"')) as total_size
FROM "EventType"
UNION ALL
SELECT 
    '_user_eventtype' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('"_user_eventtype"')) as total_size
FROM "_user_eventtype";

-- Check existing indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename IN ('EventType', '_user_eventtype');

-- Suggested batch size calculation (assuming 1000 records per batch)
SELECT 
    CEIL(COUNT(*)::float / 1000) as suggested_batches,
    COUNT(*) as total_records
FROM "_user_eventtype"; 
