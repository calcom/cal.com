export declare const outOfOfficeReasonList: () => Promise<{
    id: number;
    userId: number | null;
    enabled: boolean;
    reason: string;
    emoji: string;
}[]>;
