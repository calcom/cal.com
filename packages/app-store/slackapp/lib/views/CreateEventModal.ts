import { User } from "@prisma/client";
import { Modal, Blocks, Elements, Bits, Message } from "slack-block-builder";

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
    | null
) => {
  return Message()
    .blocks(
      Blocks.Section({ text: `Hey there, *${data?.user?.username}!*` }),
      Blocks.Divider(),
      Blocks.Input({ label: "Event Name" }).element(
        Elements.TextInput({ placeholder: "Event Name" }).actionId("event_name")
      ),
      Blocks.Input({ label: "Which event would you like to create?" }).element(
        Elements.StaticSelect({ placeholder: "Which event would you like to create?" })
          .actionId("create.event.type")
          .options(
            data?.user?.eventTypes.map((item: any) =>
              Bits.Option({ text: item.title ?? "No Name", value: item.id.toString() })
            )
          )
      ), // This doesnt need to reach out to the server when the user changes the selection
      Blocks.Input({ label: "Who would you like to invite to your event?" }).element(
        Elements.UserMultiSelect({ placeholder: "Who would you like to invite to your event?" }).actionId(
          "invite_users"
        )
      ),
      Blocks.Input({ label: "When would this event be?" }).element(
        Elements.DatePicker({ placeholder: "Select Date" }).actionId("event_date")
      ),
      Blocks.Input({ label: "What time would you like to start?" }).element(
        Elements.TimePicker({ placeholder: "Select Time" }).actionId("event_start_time")
      ), // TODO: We could in future validate if the time is in the future or if busy at point - Didnt see much point as this gets validated when you submit. Could be better UX
      Blocks.Actions().elements(
        Elements.Button({ text: "Cancel", actionId: "cal.event.cancel" }).danger(),
        Elements.Button({ text: "Create", actionId: "cal.event.create" }).primary()
      )
    )
    .asUser()
    .buildToObject();
};

export default CreateEventModal;

// Elements.StaticSelect({ placeholder: "Which event would you like to create?" })
//   .actionId("events_types")
//   .options(data.events.map((item) => Bits.Option({ text: item.name, value: item.id })))
