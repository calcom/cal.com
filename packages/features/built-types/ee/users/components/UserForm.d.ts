/// <reference types="react" />
import type { UserAdminRouterOutputs } from "../server/trpc-router";
type User = UserAdminRouterOutputs["get"]["user"];
type Option<T extends string | number = string> = {
    value: T;
    label: string;
};
type OptionValues = {
    locale: Option;
    timeFormat: Option<number>;
    timeZone: string;
    weekStart: Option;
    role: Option;
    identityProvider: Option;
};
type FormValues = Pick<User, "avatarUrl" | "name" | "username" | "email" | "bio"> & OptionValues;
export declare const UserForm: ({ defaultValues, localeProp, onSubmit, submitLabel, }: {
    defaultValues?: Pick<{
        name: string | null;
        email: string;
        id: number;
        organizationId: number | null;
        locale: string | null;
        twoFactorSecret: string | null;
        emailVerified: Date | null;
        identityProviderId: string | null;
        invitedTo: number | null;
        allowDynamicBooking: boolean | null;
        verified: boolean | null;
        username: string | null;
        bio: string | null;
        avatarUrl: string | null;
        timeZone: string;
        weekStart: string;
        startTime: number;
        endTime: number;
        bufferTime: number;
        hideBranding: boolean;
        theme: string | null;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        timeFormat: number | null;
        twoFactorEnabled: boolean;
        backupCodes: string | null;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        brandColor: string | null;
        darkBrandColor: string | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        metadata: import(".prisma/client").Prisma.JsonValue;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        locked: boolean;
        movedToProfileId: number | null;
        isPlatformManaged: boolean;
        smsLockState: import(".prisma/client").$Enums.SMSLockState;
        smsLockReviewedByAdmin: boolean;
    }, "name" | "email" | "username" | "bio" | "avatarUrl" | keyof OptionValues> | undefined;
    localeProp?: string | undefined;
    onSubmit: (data: FormValues) => void;
    submitLabel?: string | undefined;
}) => JSX.Element;
export {};
//# sourceMappingURL=UserForm.d.ts.map