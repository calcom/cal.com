import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm } from "react-hook-form";

import {
  Input,
  Label,
  InputLeading,
  TextField,
  PasswordField,
  EmailInput,
  EmailField,
  TextArea,
  TextAreaField,
  Form,
  FieldsetLegend,
  InputGroupBox,
} from "./Fields";

const meta = {
  title: "Address/Fields",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

// Input Component Stories
export const BasicInput: StoryObj<typeof Input> = {
  name: "Basic Input",
  render: () => <Input name="basic" placeholder="Enter text..." />,
};

export const InputWithValue: StoryObj<typeof Input> = {
  name: "Input with Value",
  render: () => <Input name="withValue" defaultValue="Sample text" />,
};

export const DisabledInput: StoryObj<typeof Input> = {
  name: "Disabled Input",
  render: () => <Input name="disabled" placeholder="Disabled input" disabled />,
};

// Label Component Stories
export const BasicLabel: StoryObj<typeof Label> = {
  name: "Basic Label",
  render: () => <Label htmlFor="example">Example Label</Label>,
};

export const LabelWithInput: StoryObj<typeof Label> = {
  name: "Label with Input",
  render: () => (
    <div>
      <Label htmlFor="example-input">Full Name</Label>
      <Input id="example-input" name="fullName" placeholder="John Doe" />
    </div>
  ),
};

// InputLeading Component Stories
export const InputLeadingExample: StoryObj<typeof InputLeading> = {
  name: "Input Leading",
  render: () => (
    <div className="flex">
      <InputLeading>https://</InputLeading>
      <Input name="website" className="rounded-l-none mt-0" placeholder="example.com" />
    </div>
  ),
};

// TextField Component Stories
export const BasicTextField: StoryObj<typeof TextField> = {
  name: "Basic TextField",
  render: () => {
    const methods = useForm();
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <TextField name="username" label="Username" placeholder="Enter username" />
      </Form>
    );
  },
};

export const TextFieldWithAddOnLeading: StoryObj<typeof TextField> = {
  name: "TextField with Leading Add-on",
  render: () => {
    const methods = useForm();
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <TextField
          name="website"
          label="Website"
          addOnLeading={<InputLeading>https://</InputLeading>}
          placeholder="example.com"
        />
      </Form>
    );
  },
};

export const TextFieldWithHint: StoryObj<typeof TextField> = {
  name: "TextField with Hint",
  render: () => {
    const methods = useForm();
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <TextField
          name="slug"
          label="Event Slug"
          placeholder="my-event"
          hint={<p className="mt-1 text-sm text-gray-500">This will be part of your event URL</p>}
        />
      </Form>
    );
  },
};

export const TextFieldWithError: StoryObj<typeof TextField> = {
  name: "TextField with Error",
  render: () => {
    const methods = useForm();
    methods.setError("errorField", {
      type: "manual",
      message: "This field is required",
    });
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <TextField name="errorField" label="Field with Error" />
      </Form>
    );
  },
};

// PasswordField Component Stories
export const BasicPasswordField: StoryObj<typeof PasswordField> = {
  name: "Basic Password Field",
  render: () => {
    const methods = useForm();
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <PasswordField name="password" label="Password" />
      </Form>
    );
  },
};

// EmailInput Component Stories
export const BasicEmailInput: StoryObj<typeof EmailInput> = {
  name: "Basic Email Input",
  render: () => <EmailInput name="email" placeholder="you@example.com" />,
};

// EmailField Component Stories
export const BasicEmailField: StoryObj<typeof EmailField> = {
  name: "Basic Email Field",
  render: () => {
    const methods = useForm();
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <EmailField name="email" label="Email Address" placeholder="you@example.com" />
      </Form>
    );
  },
};

// TextArea Component Stories
export const BasicTextArea: StoryObj<typeof TextArea> = {
  name: "Basic TextArea",
  render: () => <TextArea name="description" placeholder="Enter description..." rows={4} />,
};

// TextAreaField Component Stories
export const BasicTextAreaField: StoryObj<typeof TextAreaField> = {
  name: "Basic TextArea Field",
  render: () => {
    const methods = useForm();
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <TextAreaField name="bio" label="Biography" placeholder="Tell us about yourself..." rows={5} />
      </Form>
    );
  },
};

export const TextAreaFieldWithError: StoryObj<typeof TextAreaField> = {
  name: "TextArea Field with Error",
  render: () => {
    const methods = useForm();
    methods.setError("bioError", {
      type: "manual",
      message: "Biography must be at least 50 characters",
    });
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <TextAreaField name="bioError" label="Biography" rows={5} />
      </Form>
    );
  },
};

// FieldsetLegend Component Stories
export const BasicFieldsetLegend: StoryObj<typeof FieldsetLegend> = {
  name: "Fieldset Legend",
  render: () => (
    <fieldset>
      <FieldsetLegend>Personal Information</FieldsetLegend>
      <div className="mt-4 space-y-3">
        <Input name="firstName" placeholder="First name" />
        <Input name="lastName" placeholder="Last name" />
      </div>
    </fieldset>
  ),
};

// InputGroupBox Component Stories
export const BasicInputGroupBox: StoryObj<typeof InputGroupBox> = {
  name: "Input Group Box",
  render: () => (
    <InputGroupBox>
      <div className="flex items-center gap-2">
        <input type="radio" name="plan" id="free" />
        <label htmlFor="free" className="text-sm">
          Free Plan
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input type="radio" name="plan" id="pro" />
        <label htmlFor="pro" className="text-sm">
          Pro Plan
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input type="radio" name="plan" id="enterprise" />
        <label htmlFor="enterprise" className="text-sm">
          Enterprise Plan
        </label>
      </div>
    </InputGroupBox>
  ),
};

// Complete Form Example
export const CompleteFormExample: StoryObj = {
  name: "Complete Form Example",
  render: () => {
    const methods = useForm({
      defaultValues: {
        fullName: "",
        email: "",
        password: "",
        website: "",
        bio: "",
      },
    });

    return (
      <Form form={methods} handleSubmit={(data) => console.log(data)}>
        <div className="space-y-4">
          <TextField name="fullName" label="Full Name" placeholder="John Doe" />
          <EmailField name="email" label="Email Address" placeholder="john@example.com" />
          <PasswordField name="password" label="Password" />
          <TextField
            name="website"
            label="Website"
            addOnLeading={<InputLeading>https://</InputLeading>}
            placeholder="example.com"
          />
          <TextAreaField name="bio" label="Biography" placeholder="Tell us about yourself..." rows={4} />
        </div>
      </Form>
    );
  },
};

// All Input Types
export const AllInputTypes: StoryObj = {
  name: "All Input Types",
  render: () => {
    const methods = useForm();
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <div className="space-y-4">
          <div>
            <Label>Basic Input</Label>
            <Input name="basic" placeholder="Basic input" />
          </div>
          <TextField name="textField" label="Text Field" placeholder="Text field with label" />
          <EmailField name="email" label="Email Field" placeholder="email@example.com" />
          <PasswordField name="password" label="Password Field" />
          <TextAreaField name="textarea" label="Text Area Field" placeholder="Enter text..." rows={3} />
        </div>
      </Form>
    );
  },
};

// Default Story
export const Default: StoryObj = {
  render: () => {
    const methods = useForm();
    return (
      <Form form={methods} handleSubmit={() => {}}>
        <TextField name="example" label="Example Field" placeholder="Enter some text..." />
      </Form>
    );
  },
};
