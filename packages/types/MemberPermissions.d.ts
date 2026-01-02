export interface MemberPermissions {
  canListMembers: boolean;
  canInvite: boolean;
  canChangeMemberRole: boolean;
  canRemove: boolean;
  canImpersonate: boolean;
  canEditAttributesForUser?: boolean;
  canViewAttributes?: boolean;
}
