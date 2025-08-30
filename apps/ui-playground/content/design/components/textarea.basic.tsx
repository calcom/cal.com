"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { TextAreaField } from "@calcom/ui/components/form";

export const BasicExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4 md:w-80">
      <TextAreaField name="message" placeholder="Enter your message..." defaultValue="" />
      <TextAreaField
        name="description"
        placeholder="With default value..."
        defaultValue="This is a default value for the textarea component."
      />
    </div>
  </RenderComponentWithSnippet>
);
