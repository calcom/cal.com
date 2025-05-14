# Permission-Based Access Control (PBAC) System

## Overview
The PBAC system provides fine-grained access control for Cal.com, allowing teams to create custom roles with specific permissions while maintaining backward compatibility with the existing role system.

## Key Concepts

### Permission Format
Permissions follow the `resource.action` format:
```typescript
type Permission = `${Resource}.${Action}`;
// Example: "eventType.create", "booking.read"
```

### Role Types
1. **Default Roles** (MembershipRole)
   - OWNER: Full access (`*.*`)
   - ADMIN: Extensive management permissions
   - MEMBER: Basic read permissions

2. **Custom Roles**
   - Team-specific roles with granular permissions
   - Can be assigned alongside default roles

## Usage Guide
