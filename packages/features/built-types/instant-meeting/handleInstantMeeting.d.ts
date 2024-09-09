import type { NextApiRequest } from "next";
export type HandleInstantMeetingResponse = {
    message: string;
    meetingTokenId: number;
    bookingId: number;
    bookingUid: string;
    expires: Date;
    userId: number | null;
};
declare function handler(req: NextApiRequest): Promise<{
    message: string;
    meetingTokenId: number;
    bookingId: number;
    bookingUid: string;
    expires: Date;
    userId: number | null;
}>;
export default handler;
//# sourceMappingURL=handleInstantMeeting.d.ts.map