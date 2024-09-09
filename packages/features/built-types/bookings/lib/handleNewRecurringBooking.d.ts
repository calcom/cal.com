import type { NextApiRequest } from "next";
import type { BookingResponse } from "@calcom/features/bookings/types";
export declare const handleNewRecurringBooking: (req: NextApiRequest & {
    userId?: number;
}) => Promise<BookingResponse[]>;
//# sourceMappingURL=handleNewRecurringBooking.d.ts.map