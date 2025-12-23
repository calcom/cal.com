import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ComponentForField } from "./FormBuilderField";

const meta = {
  component: ComponentForField,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "400px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComponentForField>;

export default meta;
type Story = StoryObj<typeof meta>;

// Text Component
export const TextComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "text",
          name: "fullName",
          label: "Full Name",
          placeholder: "Enter your full name",
          required: true,
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Textarea Component
export const TextareaComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "textarea",
          name: "description",
          label: "Description",
          placeholder: "Enter a description...",
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Number Component
export const NumberComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "number",
          name: "age",
          label: "Age",
          placeholder: "Enter your age",
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Name Component - Full Name Variant
export const NameComponentFullName: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "name",
          name: "name",
          label: "Name",
          variant: "fullName",
          variantsConfig: {
            variants: {
              fullName: {
                fields: [
                  {
                    name: "name",
                    label: "Full Name",
                    placeholder: "John Doe",
                    required: true,
                  },
                ],
              },
            },
          },
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Name Component - First and Last Name Variant
export const NameComponentFirstAndLastName: Story = {
  render: () => {
    const [value, setValue] = useState<Record<string, string>>({});
    return (
      <ComponentForField
        field={{
          type: "name",
          name: "name",
          label: "Name",
          variant: "firstAndLastName",
          variantsConfig: {
            variants: {
              firstAndLastName: {
                fields: [
                  {
                    name: "firstName",
                    label: "First Name",
                    placeholder: "John",
                    required: true,
                  },
                  {
                    name: "lastName",
                    label: "Last Name",
                    placeholder: "Doe",
                    required: true,
                  },
                ],
              },
            },
          },
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Email Component
export const EmailComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "email",
          name: "email",
          label: "Email Address",
          placeholder: "you@example.com",
          required: true,
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Phone Component
export const PhoneComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "phone",
          name: "phone",
          label: "Phone Number",
          placeholder: "+1 (555) 000-0000",
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Address Component
export const AddressComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "address",
          name: "address",
          label: "Address",
          placeholder: "Enter your address",
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Multi-Email Component
export const MultiEmailComponent: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([""]);
    return (
      <ComponentForField
        field={{
          type: "multiemail",
          name: "guests",
          label: "Add Guests",
          placeholder: "guest@example.com",
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Select Component
export const SelectComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "select",
          name: "country",
          label: "Country",
          placeholder: "Select a country",
          options: [
            { label: "United States", value: "us" },
            { label: "Canada", value: "ca" },
            { label: "United Kingdom", value: "uk" },
            { label: "Australia", value: "au" },
          ],
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Multiselect Component
export const MultiselectComponent: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <ComponentForField
        field={{
          type: "multiselect",
          name: "interests",
          label: "Interests",
          placeholder: "Select your interests",
          options: [
            { label: "Technology", value: "tech" },
            { label: "Sports", value: "sports" },
            { label: "Music", value: "music" },
            { label: "Art", value: "art" },
            { label: "Travel", value: "travel" },
          ],
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Checkbox Component
export const CheckboxComponent: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <ComponentForField
        field={{
          type: "checkbox",
          name: "preferences",
          label: "Preferences",
          options: [
            { label: "Email notifications", value: "email" },
            { label: "SMS notifications", value: "sms" },
            { label: "Push notifications", value: "push" },
          ],
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Radio Component
export const RadioComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "radio",
          name: "gender",
          label: "Gender",
          options: [
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Other", value: "other" },
            { label: "Prefer not to say", value: "not_say" },
          ],
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// RadioInput Component
export const RadioInputComponent: Story = {
  render: () => {
    const [value, setValue] = useState<{ value: string; optionValue: string }>({
      value: "phone",
      optionValue: "",
    });
    return (
      <ComponentForField
        field={{
          type: "radioInput",
          name: "location",
          label: "Where would you like to meet?",
          options: [
            { label: "Phone Call", value: "phone" },
            { label: "Video Meeting", value: "video" },
            { label: "In Person", value: "inPerson" },
          ],
          optionsInputs: {
            phone: {
              type: "phone",
              required: true,
              placeholder: "+1 (555) 000-0000",
            },
            inPerson: {
              type: "address",
              required: true,
              placeholder: "Enter meeting address",
            },
          },
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
        translatedDefaultLabel="Location"
      />
    );
  },
};

// Boolean Component
export const BooleanComponent: Story = {
  render: () => {
    const [value, setValue] = useState(false);
    return (
      <ComponentForField
        field={{
          type: "boolean",
          name: "terms",
          label: "I agree to the terms and conditions",
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// URL Component
export const URLComponent: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "url",
          name: "website",
          label: "Website",
          placeholder: "https://example.com",
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Read-only States
export const ReadOnlyText: Story = {
  render: () => {
    const [value, setValue] = useState("John Doe");
    return (
      <ComponentForField
        field={{
          type: "text",
          name: "fullName",
          label: "Full Name (Read-only)",
          placeholder: "Enter your full name",
        }}
        value={value}
        setValue={setValue}
        readOnly={true}
      />
    );
  },
};

export const ReadOnlySelect: Story = {
  render: () => {
    const [value, setValue] = useState("us");
    return (
      <ComponentForField
        field={{
          type: "select",
          name: "country",
          label: "Country (Read-only)",
          options: [
            { label: "United States", value: "us" },
            { label: "Canada", value: "ca" },
            { label: "United Kingdom", value: "uk" },
          ],
        }}
        value={value}
        setValue={setValue}
        readOnly={true}
      />
    );
  },
};

export const ReadOnlyCheckbox: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["email", "sms"]);
    return (
      <ComponentForField
        field={{
          type: "checkbox",
          name: "preferences",
          label: "Preferences (Read-only)",
          options: [
            { label: "Email notifications", value: "email" },
            { label: "SMS notifications", value: "sms" },
            { label: "Push notifications", value: "push" },
          ],
        }}
        value={value}
        setValue={setValue}
        readOnly={true}
      />
    );
  },
};

// Default story showcasing all field types
export const Default: Story = {
  render: () => {
    const [textValue, setTextValue] = useState("");
    const [emailValue, setEmailValue] = useState("");
    const [selectValue, setSelectValue] = useState("");
    const [booleanValue, setBooleanValue] = useState(false);

    return (
      <div className="space-y-6">
        <ComponentForField
          field={{
            type: "text",
            name: "name",
            label: "Name",
            placeholder: "Enter your name",
            required: true,
          }}
          value={textValue}
          setValue={setTextValue}
          readOnly={false}
        />
        <ComponentForField
          field={{
            type: "email",
            name: "email",
            label: "Email",
            placeholder: "you@example.com",
            required: true,
          }}
          value={emailValue}
          setValue={setEmailValue}
          readOnly={false}
        />
        <ComponentForField
          field={{
            type: "select",
            name: "role",
            label: "Role",
            placeholder: "Select your role",
            options: [
              { label: "Developer", value: "dev" },
              { label: "Designer", value: "design" },
              { label: "Manager", value: "manager" },
            ],
          }}
          value={selectValue}
          setValue={setSelectValue}
          readOnly={false}
        />
        <ComponentForField
          field={{
            type: "boolean",
            name: "newsletter",
            label: "Subscribe to newsletter",
          }}
          value={booleanValue}
          setValue={setBooleanValue}
          readOnly={false}
        />
      </div>
    );
  },
  parameters: {
    layout: "padded",
  },
};

// Form with validation constraints
export const WithValidationConstraints: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <ComponentForField
        field={{
          type: "text",
          name: "username",
          label: "Username",
          placeholder: "Enter username",
          required: true,
          minLength: 3,
          maxLength: 20,
        }}
        value={value}
        setValue={setValue}
        readOnly={false}
      />
    );
  },
};

// Pre-filled form fields
export const PrefilledForm: Story = {
  render: () => {
    const [nameValue, setNameValue] = useState("Jane Smith");
    const [emailValue, setEmailValue] = useState("jane@example.com");
    const [countryValue, setCountryValue] = useState("us");

    return (
      <div className="space-y-6">
        <ComponentForField
          field={{
            type: "text",
            name: "name",
            label: "Name",
            placeholder: "Enter your name",
          }}
          value={nameValue}
          setValue={setNameValue}
          readOnly={false}
        />
        <ComponentForField
          field={{
            type: "email",
            name: "email",
            label: "Email",
            placeholder: "you@example.com",
          }}
          value={emailValue}
          setValue={setEmailValue}
          readOnly={false}
        />
        <ComponentForField
          field={{
            type: "select",
            name: "country",
            label: "Country",
            options: [
              { label: "United States", value: "us" },
              { label: "Canada", value: "ca" },
              { label: "United Kingdom", value: "uk" },
            ],
          }}
          value={countryValue}
          setValue={setCountryValue}
          readOnly={false}
        />
      </div>
    );
  },
  parameters: {
    layout: "padded",
  },
};
