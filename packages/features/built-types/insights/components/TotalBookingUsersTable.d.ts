/// <reference types="react" />
import type { User } from "@calcom/prisma/client";
export declare const TotalBookingUsersTable: ({ data, }: {
    data: {
        userId: number | null;
        user: Pick<User, "avatarUrl" | "name">;
        emailMd5?: string;
        count: number;
        username?: string;
    }[] | undefined;
}) => JSX.Element;
//# sourceMappingURL=TotalBookingUsersTable.d.ts.map