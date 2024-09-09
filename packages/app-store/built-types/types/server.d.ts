import type { TFunction } from "next-i18next";
export declare function getLocationGroupedOptions(userOrTeamId: {
    userId: number;
} | {
    teamId: number;
}, t: TFunction): Promise<{
    label: string;
    options: {
        label: string;
        value: string;
        disabled?: boolean | undefined;
        icon?: string | undefined;
        slug?: string | undefined;
        credentialId?: number | undefined;
    }[];
}[]>;
//# sourceMappingURL=server.d.ts.map