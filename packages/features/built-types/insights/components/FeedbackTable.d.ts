/// <reference types="react" />
import type { User } from "@calcom/prisma/client";
export declare const FeedbackTable: ({ data, }: {
    data: {
        userId: number | null;
        user: Pick<User, "avatarUrl" | "name">;
        emailMd5?: string;
        username?: string;
        rating: number | null;
        feedback: string | null;
    }[] | undefined;
}) => JSX.Element;
//# sourceMappingURL=FeedbackTable.d.ts.map