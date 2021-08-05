import runMiddleware, { checkAmiliAuth } from "@lib/amili/middleware";
import { cancelBookingByUid } from "pages/api/cancel";

export default async function handler(req, res) {
  if (req.method == "POST") {
    await runMiddleware(req, res, checkAmiliAuth);
    const uid = req.body.uid;
    await cancelBookingByUid(uid);
    res.status(200).json({ message: "Booking successfully deleted." });
  } else {
    res.status(405).json({ message: "This endpoint only accepts POST requests." });
  }
}
