import type { TUserEmailVerificationRequiredSchema } from "./checkIfUserEmailVerificationRequired.schema";
export declare const userWithEmailHandler: ({ input }: {
    input: TUserEmailVerificationRequiredSchema;
}) => Promise<boolean>;
export default userWithEmailHandler;
