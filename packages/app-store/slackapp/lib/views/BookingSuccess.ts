import { Booking } from "@prisma/client";
import dayjs from "dayjs";
import { Modal, Blocks, Elements, Bits, Message } from "slack-block-builder";

import { BASE_URL } from "@calcom/lib/constants";

const BookingSuccess = () => {
  return Message()
    .blocks(Blocks.Section({ text: `Your booking has been created!` }))
    .buildToObject();
};

export default BookingSuccess;
