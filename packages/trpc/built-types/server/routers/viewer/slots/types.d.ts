import { z } from "zod";
export declare const getScheduleSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    startTime: z.ZodString;
    endTime: z.ZodString;
    eventTypeId: z.ZodOptional<z.ZodNumber>;
    eventTypeSlug: z.ZodOptional<z.ZodString>;
    timeZone: z.ZodOptional<z.ZodString>;
    usernameList: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    debug: z.ZodOptional<z.ZodBoolean>;
    duration: z.ZodEffects<z.ZodOptional<z.ZodString>, number | "" | undefined, string | undefined>;
    rescheduleUid: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isTeamEvent: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    orgSlug: z.ZodOptional<z.ZodString>;
    teamMemberEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    startTime: string;
    endTime: string;
    isTeamEvent: boolean;
    eventTypeId?: number | undefined;
    eventTypeSlug?: string | undefined;
    timeZone?: string | undefined;
    usernameList?: string[] | undefined;
    debug?: boolean | undefined;
    duration?: number | "" | undefined;
    rescheduleUid?: string | null | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
}, {
    startTime: string;
    endTime: string;
    eventTypeId?: number | undefined;
    eventTypeSlug?: string | undefined;
    timeZone?: string | undefined;
    usernameList?: string[] | undefined;
    debug?: boolean | undefined;
    duration?: string | undefined;
    rescheduleUid?: string | null | undefined;
    isTeamEvent?: boolean | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
}>, {
    startTime: string;
    endTime: string;
    isTeamEvent: boolean;
    eventTypeId?: number | undefined;
    eventTypeSlug?: string | undefined;
    timeZone?: string | undefined;
    usernameList?: string[] | undefined;
    debug?: boolean | undefined;
    duration?: number | "" | undefined;
    rescheduleUid?: string | null | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
}, {
    startTime: string;
    endTime: string;
    eventTypeId?: number | undefined;
    eventTypeSlug?: string | undefined;
    timeZone?: string | undefined;
    usernameList?: string[] | undefined;
    debug?: boolean | undefined;
    duration?: string | undefined;
    rescheduleUid?: string | null | undefined;
    isTeamEvent?: boolean | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
}>, {
    startTime: string;
    endTime: string;
    isTeamEvent: boolean;
    eventTypeId?: number | undefined;
    eventTypeSlug?: string | undefined;
    timeZone?: string | undefined;
    usernameList?: string[] | undefined;
    debug?: boolean | undefined;
    duration?: number | "" | undefined;
    rescheduleUid?: string | null | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
}, {
    startTime: string;
    endTime: string;
    eventTypeId?: number | undefined;
    eventTypeSlug?: string | undefined;
    timeZone?: string | undefined;
    usernameList?: string[] | undefined;
    debug?: boolean | undefined;
    duration?: string | undefined;
    rescheduleUid?: string | null | undefined;
    isTeamEvent?: boolean | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
}>;
export declare const reserveSlotSchema: z.ZodEffects<z.ZodObject<{
    eventTypeId: z.ZodNumber;
    slotUtcStartDate: z.ZodString;
    slotUtcEndDate: z.ZodString;
    bookingUid: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    eventTypeId: number;
    slotUtcStartDate: string;
    slotUtcEndDate: string;
    bookingUid?: string | undefined;
}, {
    eventTypeId: number;
    slotUtcStartDate: string;
    slotUtcEndDate: string;
    bookingUid?: string | undefined;
}>, {
    eventTypeId: number;
    slotUtcStartDate: string;
    slotUtcEndDate: string;
    bookingUid?: string | undefined;
}, {
    eventTypeId: number;
    slotUtcStartDate: string;
    slotUtcEndDate: string;
    bookingUid?: string | undefined;
}>;
export type Slot = {
    time: string;
    userIds?: number[];
    attendees?: number;
    bookingUid?: string;
    users?: string[];
};
export declare const removeSelectedSlotSchema: z.ZodObject<{
    uid: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    uid: string | null;
}, {
    uid: string | null;
}>;
