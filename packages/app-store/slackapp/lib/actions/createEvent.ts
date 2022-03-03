import { NextApiRequest, NextApiResponse } from "next";

// export type BookingCreateBody = {
//   email: string;
//   end: string;
//   web3Details?: {
//     userWallet: string;
//     userSignature: unknown;
//   };
//   eventTypeId: number;
//   guests?: string[];
//   location: string;
//   name: string;
//   notes?: string;
//   rescheduleUid?: string;
//   start: string;
//   timeZone: string;
//   user?: string | string[];
//   language: string;
//   customInputs: { label: string; value: string }[];
//   metadata: {
//     [key: string]: string;
//   };
// };
// "state": {
//   "values": {
//     "cibye": {
//       "events_types": {
//         "type": "static_select",
//         "selected_option": {
//           "text": { "type": "plain_text", "text": "30min", "emoji": true },
//           "value": "3"
//         }
//       }
//     },
//     "AIdX": {
//       "invite_users": { "type": "multi_users_select", "selected_users": [] }
//     },
//     "mssz": { "event_date": { "type": "datepicker", "selected_date": null } },
//     "/DY": {
//       "event_start_time": { "type": "timepicker", "selected_time": null }
//     }
//   }
export default async function createEvent(req: NextApiRequest, res: NextApiResponse) {
  const { user, state } = req.body;
  console.log({ user, state });
  // This could get a bit weird as there is a 3 second limit until the post times out
  res.status(200).json("ok");
}
