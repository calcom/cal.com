import { Credential } from "@prisma/client";
import { Bits, Blocks, Elements, Modal, setIfTruthy } from "slack-block-builder";

const CreateEventModal = (
  data:
    | (Credential & {
        user: {
          username: string | null;
          eventTypes: {
            id: number;
            title: string;
          }[];
        } | null;
      })
    | null,
  invalidInput = false
) => {
  return Modal({ title: "Create Booking", submit: "Create", callbackId: "cal.event.create" })
    .blocks(
      Blocks.Section({ text: `Hey there, *${data?.user?.username}!*` }),
      Blocks.Divider(),
      Blocks.Input({ label: "Your Name", blockId: "eventName" }).element(
        Elements.TextInput({ placeholder: "Event Name" }).actionId("event_name")
      ),
      Blocks.Input({ label: "Which event would you like to create?", blockId: "eventType" }).element(
        Elements.StaticSelect({ placeholder: "Which event would you like to create?" })
          .actionId("create.event.type")
          .options(
            data?.user?.eventTypes.map((item: any) =>
              Bits.Option({ text: item.title ?? "No Name", value: item.id.toString() })
            )
          )
      ), // This doesnt need to reach out to the server when the user changes the selection
      Blocks.Input({
        label: "Who would you like to invite to your event?",
        blockId: "selectedUsers",
      }).element(
        Elements.UserMultiSelect({ placeholder: "Who would you like to invite to your event?" }).actionId(
          "invite_users"
        )
      ),
      Blocks.Input({ label: "When would this event be?", blockId: "eventDate" }).element(
        Elements.DatePicker({ placeholder: "Select Date" }).actionId("event_date")
      ),
      Blocks.Input({ label: "What time would you like to start?", blockId: "eventTime" }).element(
        Elements.TimePicker({ placeholder: "Select Time" }).actionId("event_start_time")
      ), // TODO: We could in future validate if the time is in the future or if busy at point - Didnt see much point as this gets validated when you submit. Could be better UX
      setIfTruthy(invalidInput, [Blocks.Section({ text: "Please fill in all the fields" })])
    )
    .buildToObject();
};

export default CreateEventModal;
