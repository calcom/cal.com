import type { Session } from "next-auth";
type SessionOptions = {
    ctx: {
        session: Session | null;
    };
};
export declare const sessionHandler: ({ ctx }: SessionOptions) => Promise<Session | null>;
export default sessionHandler;
