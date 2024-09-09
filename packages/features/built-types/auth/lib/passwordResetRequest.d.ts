import type { User } from "@prisma/client";
export declare const PASSWORD_RESET_EXPIRY_HOURS = 6;
declare const passwordResetRequest: (user: Pick<User, "email" | "name" | "locale">) => Promise<void>;
export { passwordResetRequest };
//# sourceMappingURL=passwordResetRequest.d.ts.map