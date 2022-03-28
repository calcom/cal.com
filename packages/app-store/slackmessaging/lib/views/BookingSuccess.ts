import { Blocks, Message } from "slack-block-builder";

const BookingSuccess = () => {
  return Message()
    .blocks(Blocks.Section({ text: `Your booking has been created!` }))
    .buildToObject();
};

export default BookingSuccess;
