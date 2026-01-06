# OAuth Improvements - Final Status

## Completed Work (This Branch)

### Commits (9 total)
1. `b8a4e2caee` fix(oauth): unify token endpoint to support refresh_token grant
2. `6b3e62321e` docs(oauth): expose /authorize and /exchange endpoints in OpenAPI
3. `98e5fe728d` security(oauth): harden JWT handling with explicit algorithm
4. `b01f66ab0b` feat(oauth): add redirectUris array field to OAuthClient
5. `49c590907e` feat(oauth): add allowedScopes field to OAuthClient
6. `a788954881` feat(oauth): implement multiple redirect URIs validation
7. `8fea023aec` feat(oauth): enforce allowedScopes validation
8. `776bdf78a9` security(oauth): comprehensive security hardening
9. `98b6d95eb1` docs(oauth): add OAuth 2.0 documentation

### Features Implemented
- **PR1**: Unified `/token` endpoint with refresh_token support
- **PR3**: OAuth v2 endpoints documented in OpenAPI
- **PR4a+b**: Multiple redirect URIs (schema + validation)
- **PR6a+b**: Scope enforcement (schema + validation)
- **Security**: Timing-safe comparison, JWT algorithm fix, centralized constants
- **Docs**: OAuth 2.0 documentation at `docs/api-reference/v1/oauth.mdx`

### Key Files Modified
- `packages/prisma/schema.prisma` - Added `redirectUris`, `allowedScopes`
- `packages/lib/crypto.ts` - Added `timingSafeCompare`, `generateSecret`, `hashSecretKey`
- `packages/features/oauth/services/OAuthService.ts` - Security hardening
- `packages/features/oauth/lib/constants.ts` - New file for centralized constants
- `packages/features/auth/lib/oAuthAuthorization.ts` - JWT algorithm fix
- `apps/web/app/api/auth/oauth/token/route.ts` - Multi-URI validation
- `packages/trpc/server/routers/viewer/oAuth/generateAuthCode.handler.ts` - Scope enforcement

## Relationship with PR #25556

PR #25556 (OAuth developer settings with approval workflow) adds:
- `OAuthClientApprovalStatus` enum (PENDING, APPROVED, REJECTED)
- `approvalStatus` field
- `userId` (creator relation)
- `websiteUrl` field
- Admin/developer UI for OAuth client management
- Email notifications

**These changes are independent and can merge in either order.**

When both merge, resolve schema conflict by combining all fields:
```prisma
model OAuthClient {
  clientId       String                    @id @unique
  redirectUri    String
  redirectUris   String[]                  @default([])        // from this branch
  clientSecret   String?
  clientType     OAuthClientType           @default(CONFIDENTIAL)
  name           String
  logo           String?
  websiteUrl     String?                                        // from #25556
  allowedScopes  AccessScope[]             @default([READ_BOOKING, READ_PROFILE])  // from this branch
  accessCodes    AccessCode[]
  approvalStatus OAuthClientApprovalStatus @default(PENDING)    // from #25556
  userId         Int?                                           // from #25556
  user           User?                     @relation(...)       // from #25556
  createdAt      DateTime                  @default(now())      // from #25556

  @@index([userId])
}
```

## PR5b: Approval Status Gating (After #25556 Merges)

After PR #25556 merges, add approval status gating to `generateAuthCode.handler.ts`:

```typescript
// Add to select:
select: {
  clientId: true,
  redirectUri: true,
  name: true,
  clientType: true,
  allowedScopes: true,
  approvalStatus: true,  // ADD THIS
  userId: true,          // ADD THIS
},

// Add after client lookup (before scope validation):
if (client.approvalStatus === "REJECTED") {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "OAuth client has been rejected",
  });
}

if (client.approvalStatus === "PENDING" && client.userId !== ctx.user.id) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "OAuth client is pending approval",
  });
}
```

This allows:
- APPROVED clients: Anyone can authorize
- PENDING clients: Only the creator can authorize (for testing)
- REJECTED clients: No one can authorize

## Next Steps

1. Create PR from this branch for review
2. Wait for #25556 to merge
3. Apply PR5b gating logic (small follow-up PR)
4. Resolve any schema conflicts during merge
