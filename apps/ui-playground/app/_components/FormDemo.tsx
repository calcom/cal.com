"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Icon, InputField } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

const formSchema = z.object({
  // Basic inputs
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  // Text fields with add-ons
  website: z.string().url("Invalid URL").optional(),
  githubUsername: z.string().optional(),
  customDomain: z.string().optional(),

  // Numbers and other types
  age: z.number().min(18, "Must be at least 18 years old").optional(),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function FormDemo() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      website: "",
      githubUsername: "",
      customDomain: "",
      age: undefined,
      phone: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Form submitted:", data);
  };

  return (
    <DemoSection title="Form">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Fields */}
        <DemoSubSection id="form-basic" title="Basic Fields">
          <div className="space-y-4">
            <InputField
              label="Username"
              {...form.register("username")}
              error={form.formState.errors.username?.message}
            />
            <InputField
              label="Email"
              type="email"
              {...form.register("email")}
              error={form.formState.errors.email?.message}
            />
            <InputField
              label="Password"
              type="password"
              {...form.register("password")}
              error={form.formState.errors.password?.message}
            />
          </div>
        </DemoSubSection>

        {/* Fields with Add-ons */}
        <DemoSubSection id="form-addons" title="Fields with Add-ons">
          <div className="space-y-4">
            <InputField
              label="Website"
              addOnLeading="https://"
              {...form.register("website")}
              error={form.formState.errors.website?.message}
            />
            <InputField
              label="GitHub Username"
              addOnLeading={<Icon name="github" className="text-subtle h-4 w-4" />}
              {...form.register("githubUsername")}
              error={form.formState.errors.githubUsername?.message}
            />
            <InputField
              label="Custom Domain"
              addOnSuffix=".cal.com"
              {...form.register("customDomain")}
              error={form.formState.errors.customDomain?.message}
            />
          </div>
        </DemoSubSection>

        {/* Number and Special Fields */}
        <DemoSubSection id="form-special" title="Number and Special Fields">
          <div className="space-y-4">
            <InputField
              label="Age"
              type="number"
              {...form.register("age", { valueAsNumber: true })}
              error={form.formState.errors.age?.message}
            />
            <InputField
              label="Phone"
              type="tel"
              addOnLeading="+"
              {...form.register("phone")}
              error={form.formState.errors.phone?.message}
            />
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
