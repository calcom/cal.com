"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Icon, InputField } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

const formSchema = z.object({
  // Basic fields
  basicSmall: z.string().min(2, "Must be at least 2 characters"),
  basicMedium: z.string().min(2, "Must be at least 2 characters"),

  // Fields with hints
  hintSmall: z.string().min(2, "Must be at least 2 characters"),
  hintMedium: z.string().min(2, "Must be at least 2 characters"),
  errorSmall: z.string().min(5, "Must be at least 5 characters"),
  errorMedium: z.string().min(5, "Must be at least 5 characters"),
  multiHintSmall: z.string().min(3, "Must be at least 3 characters"),
  multiHintMedium: z.string().min(3, "Must be at least 3 characters"),

  // Fields with add-ons
  username: z.string().min(2, "Username must be at least 2 characters"),
  domain: z.string().min(2, "Domain must be at least 2 characters"),
  website: z.string().url("Must be a valid URL"),
  date: z.string().min(1, "Please select a date"),

  // Label variations
  leftLabel: z.string().optional(),
  rightLabel: z.string().optional(),
  noLabel: z.string().optional(),
  withHint: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function TextFieldDemo() {
  const onSubmit = (data: FormValues) => {
    console.log("Form submitted:", data);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // Basic fields
      basicSmall: "",
      basicMedium: "",

      // Fields with hints
      hintSmall: "",
      hintMedium: "",
      errorSmall: "",
      errorMedium: "",
      multiHintSmall: "",
      multiHintMedium: "",

      // Fields with add-ons
      username: "",
      domain: "",
      website: "",
      date: "",

      // Label variations
      leftLabel: "",
      rightLabel: "",
      noLabel: "",
      withHint: "",
    },
  });

  return (
    <DemoSection title="TextField">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic TextField */}
        <DemoSubSection id="textfield-basic" title="Basic">
          <div className="space-y-6">
            <div className="space-y-4">
              <InputField
                label="Basic TextField (sm)"
                placeholder="Enter text..."
                type="text"
                size="sm"
                {...form.register("basicSmall")}
                error={form.formState.errors.basicSmall?.message}
              />
              <InputField
                label="Basic TextField (md)"
                placeholder="Enter text..."
                type="text"
                size="md"
                {...form.register("basicMedium")}
                error={form.formState.errors.basicMedium?.message}
              />
            </div>
          </div>
        </DemoSubSection>

        {/* With Hints and Errors */}
        <DemoSubSection id="textfield-hints" title="With Hints & Errors">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-4">
                <InputField
                  label="With Hint (sm)"
                  placeholder="Enter text..."
                  type="text"
                  hint="This is a helpful hint message"
                  size="sm"
                  {...form.register("hintSmall")}
                  error={form.formState.errors.hintSmall?.message}
                />
                <InputField
                  label="With Hint (md)"
                  placeholder="Enter text..."
                  type="text"
                  hint="This is a helpful hint message"
                  size="md"
                  {...form.register("hintMedium")}
                  error={form.formState.errors.hintMedium?.message}
                />
                <InputField
                  label="With Error (sm)"
                  placeholder="Enter text..."
                  type="text"
                  size="sm"
                  {...form.register("errorSmall")}
                  error={form.formState.errors.errorSmall?.message}
                />
                <InputField
                  label="With Error (md)"
                  placeholder="Enter text..."
                  type="text"
                  size="md"
                  {...form.register("errorMedium")}
                  error={form.formState.errors.errorMedium?.message}
                />
                <InputField
                  label="With Multiple Hints (sm)"
                  placeholder="Enter text..."
                  type="text"
                  hint="Primary hint message"
                  hintErrors={["Additional hint 1", "Additional hint 2"]}
                  size="sm"
                  {...form.register("multiHintSmall")}
                  error={form.formState.errors.multiHintSmall?.message}
                />
                <InputField
                  label="With Multiple Hints (md)"
                  placeholder="Enter text..."
                  type="text"
                  hint="Primary hint message"
                  hintErrors={["Additional hint 1", "Additional hint 2"]}
                  size="md"
                  {...form.register("multiHintMedium")}
                  error={form.formState.errors.multiHintMedium?.message}
                />
              </div>
            </div>
          </div>
        </DemoSubSection>

        {/* With Add-ons */}
        <DemoSubSection id="textfield-addons" title="With Add-ons">
          <div className="space-y-6">
            <div className="space-y-4">
              <InputField
                label="Username Input"
                placeholder="Enter username"
                addOnLeading={<Icon name="user" className="text-subtle h-4 w-4" />}
                {...form.register("username")}
                error={form.formState.errors.username?.message}
              />
              <InputField
                label="Domain Input"
                addOnSuffix=".com"
                {...form.register("domain")}
                error={form.formState.errors.domain?.message}
              />
              <InputField
                label="Website Input"
                addOnLeading="https://"
                addOnSuffix=".cal.com"
                {...form.register("website")}
                error={form.formState.errors.website?.message}
              />
              <InputField
                label="Date Input"
                placeholder="Select date"
                addOnSuffix={<Icon name="calendar" className="text-subtle h-4 w-4" />}
                onClickAddon={() => alert("Add-on clicked!")}
                {...form.register("date")}
                error={form.formState.errors.date?.message}
              />
            </div>
          </div>
        </DemoSubSection>

        {/* Label Variations */}
        <DemoSubSection id="textfield-labels" title="Label Variations">
          <div className="space-y-6">
            <div className="space-y-4">
              <InputField
                label="Required Field"
                placeholder="This field is required"
                required
                showAsteriskIndicator
                {...form.register("leftLabel")}
                error={form.formState.errors.leftLabel?.message}
              />
              <InputField
                label="Screen Reader Only Label"
                placeholder="Label only visible to screen readers"
                labelSrOnly
                {...form.register("rightLabel")}
                error={form.formState.errors.rightLabel?.message}
              />
              <InputField
                label="With Locked Icon"
                placeholder="This field has a lock icon"
                LockedIcon={<Icon name="lock" className="text-subtle h-4 w-4" />}
                {...form.register("noLabel")}
                error={form.formState.errors.noLabel?.message}
              />
              <InputField
                label="Custom Label Props"
                placeholder="Custom label styling"
                labelClassName="text-blue-500 font-bold"
                {...form.register("withHint")}
                error={form.formState.errors.withHint?.message}
              />
            </div>
          </div>
        </DemoSubSection>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button color="minimal" type="button" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            Submit
          </Button>
        </div>
      </form>
    </DemoSection>
  );
}
