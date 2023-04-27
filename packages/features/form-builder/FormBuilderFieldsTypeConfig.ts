import type z from "zod";

import type { fieldsSchema, FieldTypeConfig } from "./FormBuilderFieldsSchema";

type Fields = z.infer<typeof fieldsSchema>;
export const FieldTypeConfigMap: Partial<Record<Fields[0]["type"], z.infer<typeof FieldTypeConfig>>> = {
  // This won't be stored in DB. It allows UI to be configured from the codebase for all existing booking fields stored in DB as well
  // Candidates for this are:
  // - Anything that you want to show in App UI only.
  // - Default values that are shown in UI that are supposed to be changed for existing bookingFields as well if user is using default values
  name: {
    variantsConfig: {
      toggleLabel: 'Split "Full name" into "First name" and "Last name"',
      defaultVariant: "fullName",
      variants: {
        firstAndLastName: {
          label: "First Name, Last Name",
          fieldsMap: {
            firstName: {
              defaultLabel: "first_name",
              canChangeRequirability: false,
            },
            lastName: {
              defaultLabel: "last_name",
              canChangeRequirability: true,
            },
          },
        },
        fullName: {
          label: "your_name",
          fieldsMap: {
            fullName: {
              defaultLabel: "your_name",
              defaultPlaceholder: "example_name",
              canChangeRequirability: false,
            },
          },
        },
      },
    },
  },
};
