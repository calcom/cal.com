import { User } from "@prisma/client";
import { Modal, Blocks, Elements, Bits } from "slack-block-builder";

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
  return Modal({ title: "Cal.com", submit: "Create" })
    .blocks(
      Blocks.Section({ text: `Hey there, ${data?.user?.username}!` }),
      Blocks.Divider(),
      Blocks.Input({ label: "Which event would you like to create?" }).element(
        Elements.StaticSelect({ placeholder: "Which event would you like to create?" })
          .actionId("events_types")
          .options(
            data?.user?.eventTypes.map((item: any) =>
              Bits.Option({ text: item.title ?? "No Name", value: item.id.toString() })
            )
          )
      ),
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
      )
    )
    .buildToJSON();
};

export default CreateEventModal;

// Elements.StaticSelect({ placeholder: "Which event would you like to create?" })
//   .actionId("events_types")
//   .options(data.events.map((item) => Bits.Option({ text: item.name, value: item.id })))
