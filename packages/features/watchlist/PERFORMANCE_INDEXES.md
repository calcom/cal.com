# Watchlist Performance Indexes Analysis

## Current Indexes (from schema.prisma)

```sql
-- Unique constraint (also serves as an index)
@@unique([type, value, organizationId])

-- Composite index for lookups
@@index([type, value, organizationId, action])
```

## Query Patterns Analysis

Based on our service methods, here are the query patterns we need to optimize:

### 1. Global Blocking Queries
```typescript
// GlobalWatchlistRepository.findBlockedEmail()
WHERE type = 'EMAIL' AND value = ? AND action = 'BLOCK' AND organizationId IS NULL

// GlobalWatchlistRepository.findBlockedDomain()  
WHERE type = 'DOMAIN' AND value = ? AND action = 'BLOCK' AND organizationId IS NULL

// GlobalWatchlistRepository.findFreeEmailDomain()
WHERE type = 'DOMAIN' AND value = ? AND source = 'FREE_DOMAIN_POLICY' AND organizationId IS NULL
```

### 2. Organization Blocking Queries
```typescript
// OrganizationWatchlistRepository.findBlockedEmail()
WHERE type = 'EMAIL' AND value = ? AND action = 'BLOCK' AND organizationId = ?

// OrganizationWatchlistRepository.findBlockedDomain()
WHERE type = 'DOMAIN' AND value = ? AND action = 'BLOCK' AND organizationId = ?
```

## Index Coverage Analysis

### ✅ **Well Covered Queries**
- Organization-specific queries: `[type, value, organizationId, action]` index covers these perfectly
- Basic lookups by type/value/org: Covered by unique constraint

### ⚠️ **Potentially Suboptimal Queries**

#### 1. Global Queries (organizationId IS NULL)
Current index: `[type, value, organizationId, action]`
- **Issue**: NULL values in organizationId may not be optimally indexed
- **Impact**: Global blocking queries might be slower than org-specific ones

#### 2. Source-based Queries (FREE_DOMAIN_POLICY)
Current index: `[type, value, organizationId, action]`
- **Issue**: No index includes `source` field
- **Impact**: Free email domain checks may require table scans

## Recommended Additional Indexes

### 1. Global Entries Optimization
```sql
-- Optimized index for global entries (isGlobal = true, organizationId IS NULL)
@@index([type, value, action, isGlobal])
```

### 2. Source-based Queries Optimization  
```sql
-- Optimized index for source-based lookups (free domains, etc.)
@@index([type, value, source, organizationId])
```

### 3. Audit Performance (if needed)
```sql
-- For audit queries by organization and time
@@index([organizationId, createdAt]) -- on WatchlistAudit table
```

## Performance Impact Assessment

### **Current Performance: GOOD** ✅
- Most queries are covered by existing composite index
- Unique constraint prevents duplicates efficiently
- Organization-specific queries are well-optimized

### **Potential Improvements: MEDIUM PRIORITY** ⚠️
- Global queries could benefit from dedicated index
- Source-based queries (free domains) could be faster
- Consider if query volume justifies additional indexes

## Recommendations

### **Immediate Action: NONE REQUIRED** ✅
Current indexes are sufficient for most use cases. The existing composite index covers the primary query patterns effectively.

### **Future Optimization (if performance issues arise):**
1. Add global-specific index if global blocking queries become a bottleneck
2. Add source-specific index if free domain checks become frequent
3. Monitor query performance in production before adding more indexes

### **Index Maintenance Notes**
- Each additional index adds write overhead
- Current 2 indexes (unique + composite) provide good balance
- Monitor actual query patterns in production before optimizing further

## Query Performance Testing

To verify performance, test these scenarios:
1. Global email blocking lookup (high frequency)
2. Organization email blocking lookup (high frequency)  
3. Free domain checking (medium frequency)
4. Batch user checking (medium frequency)

**Status**: ✅ **Current indexes are adequate for expected load patterns**

## New System Admin Query

### System Admin - List All Entries
```typescript
// OrganizationWatchlistRepository.listAllOrganizationEntries()
WHERE organizationId IS NOT NULL AND isGlobal = false AND action = 'BLOCK'
```

**Performance Note**: This query returns ALL organization entries across the system. For large systems with many organizations, consider:
- Adding pagination if result sets become large
- Monitoring query performance as data grows
- Potential index: `[organizationId, isGlobal, action]` if this becomes a frequent operation
