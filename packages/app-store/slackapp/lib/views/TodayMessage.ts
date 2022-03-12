import { Booking } from "@prisma/client";
import { Modal, Blocks, Elements, Bits, Message } from "slack-block-builder";

import { BASE_URL } from "@calcom/lib/constants";

const TodayMessage = (bookings: Booking[]) => {
  if (bookings.length === 0) {
    return Message().blocks(Blocks.Section({ text: "You do not have any bookings for today." }));
  }
  return Message()
    .blocks(
      Blocks.Section({ text: `Todays Bookings.` }),
      Blocks.Divider(),
      bookings.map((booking) =>
        Blocks.Section({ text: booking.title }).accessory(
          Elements.Button({ text: "Cancel", url: `${BASE_URL}/cancel/${booking.id}` })
        )
      ),
      Blocks.Actions().elements(Elements.Button({ text: "close", actionId: "cal.event.cancel" }).danger())
    )
    .buildToObject();
};

export default TodayMessage;
