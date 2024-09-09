/// <reference types="react" />
import type { User } from "@calcom/prisma/client";
export declare const TotalUserFeedbackTable: ({ data, }: {
    data: {
        userId: number | null;
        user: Pick<User, "avatarUrl" | "name">;
        emailMd5?: string;
        count?: number;
        averageRating?: number | null;
        username?: string;
    }[] | undefined;
}) => JSX.Element;
//# sourceMappingURL=TotalUserFeedbackTable.d.ts.map