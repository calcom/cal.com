import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { handleCancelBooking } from "@calcom/features/bookings/lib/handleCancelBooking"; // Adjust the import based on your actual implementation

export default async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // Retrieve session information
      const session = await getServerSession({ req, res });
      const userId = session?.user?.id || -1;

      // Extract necessary fields from the request body
      const { uid, cancellationReason, allRemainingBookings, seatReferenceUid, rescheduledBy, canceledBy } = req.body;

      // Call function to handle cancellation, passing all relevant fields
      const result = await handleCancelBooking({
        userId,
        uid,
        cancellationReason,
        allRemainingBookings,
        seatReferenceUid,
        rescheduledBy,
        canceledBy,
      });

      // Handle success response
      res.status(200).json({ success: true, result });
    } catch (error) {
      // Handle errors
      console.error('Error handling cancellation:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    // Handle unsupported HTTP methods
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}

