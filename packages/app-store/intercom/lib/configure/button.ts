import type { NextApiRequest } from "next";

import type { NewCanvas, InputComponent, SpacerComponent, TextComponent, ButtonComponent } from "../../lib";

export async function handleButtonAndInvitationStep(req: NextApiRequest): Promise<NewCanvas | undefined> {
  const { input_values, current_canvas, component_id } = req.body;

  const errors = [];

  if (input_values?.invitation_text && input_values.invitation_text.length > 100) {
    errors.push("Invitation text must be less than 100 characters.");
  }

  if (input_values?.booking_button_text && input_values.booking_button_text.length > 20) {
    errors.push("Booking button text must be less than 20 characters.");
  }

  if (errors.length === 0 && Object.keys(input_values).includes("booking_button_input")) return;

  const invitationTextInput: InputComponent = {
    type: "input",
    id: "invitation_input",
    label: "Invitation text",
    placeholder: "Schedule a meeting with me",
    value: "Schedule a meeting with me",
    aria_label: "Enter invitation text",
  };

  const bookingButtonTextInput: InputComponent = {
    type: "input",
    id: "booking_button_input",
    label: "Booking button text",
    placeholder: "Book now",
    value: "Book now",
    aria_label: "Enter booking button text",
  };

  const spacer: SpacerComponent = {
    type: "spacer",
    size: "m",
  };

  const button: ButtonComponent = {
    type: "button",
    id: "booking_button",
    label: "Create an invite",
    action: {
      type: "submit",
    },
  };

  const submit_booking_url = current_canvas?.stored_data?.submit_booking_url
    ? current_canvas?.stored_data?.submit_booking_url
    : component_id === "submit_booking_url"
    ? input_values?.submit_booking_url
    : component_id;

  return {
    canvas: {
      content: {
        components: [
          spacer,
          invitationTextInput,
          bookingButtonTextInput,
          button,
          ...errors?.map(
            (e) =>
              ({
                type: "text",
                text: e,
                style: "error",
                align: "left",
              } as TextComponent)
          ),
        ],
      },
      stored_data: {
        submit_booking_url,
      },
    },
  };
}
