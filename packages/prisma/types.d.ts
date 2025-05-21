declare global {
  namespace PrismaJson {
    type EventTypeMetaData = any;
  }
}

declare module "@prisma/client" {
  namespace Prisma {
    interface EventTypeCreateInput {
      customReplyToEmail?: string | null;
      hideOrganizerEmail?: boolean;
      includeNoShowInRRCalculation?: boolean;
    }

    interface EventTypeUpdateInput {
      customReplyToEmail?: string | null;
      hideOrganizerEmail?: boolean;
      includeNoShowInRRCalculation?: boolean;
    }

    interface EventTypeSelect {
      customReplyToEmail?: boolean;
      hideOrganizerEmail?: boolean;
      includeNoShowInRRCalculation?: boolean;
    }

    interface MembershipCreateInput {
      createdAt?: Date | string | null;
    }

    interface MembershipSelect {
      createdAt?: boolean;
    }

    interface OrganizationSettingsUpdateInput {
      disablePhoneOnlySMSNotifications?: boolean;
    }

    interface OrganizationSettingsSelect {
      disablePhoneOnlySMSNotifications?: boolean;
    }

    interface CredentialPayload {
      delegationCredentialId?: string | null;
    }

    interface CredentialSelect {
      delegationCredentialId?: boolean;
    }

    interface CalendarCacheWhereInput {
      userId?: number | Prisma.IntFilter<Prisma.CalendarCacheScalarWhereInput>;
    }

    interface CalendarCacheUpdateInput {
      userId?: number;
    }

    interface CalendarCacheCreateInput {
      userId?: number;
    }
  }
}
