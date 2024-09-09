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
        metadata: import(".prisma/client").Prisma.JsonValue;
        theme: string | null;
        id: number;
        name: string | null;
        email: string;
        organizationId: number | null;
        timeZone: string;
        username: string | null;
        locale: string | null;
        startTime: number;
        endTime: number;
        bio: string | null;
        hideBranding: boolean;
        brandColor: string | null;
        darkBrandColor: string | null;
        timeFormat: number | null;
        weekStart: string;
        smsLockState: import(".prisma/client").$Enums.SMSLockState;
        smsLockReviewedByAdmin: boolean;
        emailVerified: Date | null;
        avatarUrl: string | null;
        bufferTime: number;
        appTheme: string | null;
        createdDate: Date;
        trialEndsAt: Date | null;
        defaultScheduleId: number | null;
        completedOnboarding: boolean;
        twoFactorSecret: string | null;
        twoFactorEnabled: boolean;
        backupCodes: string | null;
        identityProvider: import(".prisma/client").$Enums.IdentityProvider;
        identityProviderId: string | null;
        invitedTo: number | null;
        allowDynamicBooking: boolean | null;
        allowSEOIndexing: boolean | null;
        receiveMonthlyDigestEmail: boolean | null;
        verified: boolean | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        disableImpersonation: boolean;
        locked: boolean;
        movedToProfileId: number | null;
        isPlatformManaged: boolean;
    }, "name" | "email" | "username" | "bio" | "avatarUrl" | keyof OptionValues> | undefined;
    localeProp?: string | undefined;
    onSubmit: (data: FormValues) => void;
    submitLabel?: string | undefined;
}) => JSX.Element;
export {};
//# sourceMappingURL=UserForm.d.ts.map