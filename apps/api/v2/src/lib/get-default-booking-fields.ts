import { SystemField } from "@calcom/platform-libraries";

export function getDefaultBookingFields() {
  const systemBeforeFields: SystemField[] = [
    {
      type: "name",
      name: "name",
      editable: "system",
      defaultLabel: "your_name",
      required: true,
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      defaultLabel: "email_address",
      type: "email",
      name: "email",
      required: true,
      editable: "system",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
  ];

  return systemBeforeFields;
}
