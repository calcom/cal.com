"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useForm, FormProvider } from "react-hook-form";

import { MultiOptionInput } from "@calcom/ui/components/form";

type FormValues = {
  newlineOptions: Array<{ label: string; id: string }>;
  commaOptions: Array<{ label: string; id: string }>;
  customOptions: Array<{ label: string; id: string }>;
  keyValueOptions: Array<{ label: string; value: string; id: string }>;
};

export const PasteExample: React.FC = () => {
  const methods = useForm<FormValues>();

  return (
    <RenderComponentWithSnippet>
      <FormProvider {...methods}>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <h3 className="text-emphasis text-sm">Default Delimiters (Newline and Comma)</h3>
              <p className="text-subtle text-xs">
                Try pasting: &ldquo;Option 1, Option 2&rdquo; or multiple lines
              </p>
              <MultiOptionInput<FormValues>
                fieldArrayName="newlineOptions"
                optionPlaceholders={["Paste here..."]}
                defaultNumberOfOptions={1}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <h3 className="text-emphasis text-sm">Comma Only Delimiter</h3>
              <p className="text-subtle text-xs">Try pasting: &ldquo;First, Second, Third&rdquo;</p>
              <MultiOptionInput<FormValues>
                fieldArrayName="commaOptions"
                optionPlaceholders={["Paste here..."]}
                defaultNumberOfOptions={1}
                pasteDelimiters={[","]}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <h3 className="text-emphasis text-sm">Key-Value Pair Paste Support</h3>
              <p className="text-subtle text-xs">
                Try pasting: &ldquo;NODE_ENV=production&rdquo; or &ldquo;KEY1:value1, KEY2:value2&rdquo;
              </p>
              <MultiOptionInput<FormValues>
                fieldArrayName="keyValueOptions"
                keyValueMode
                optionPlaceholders={["Key..."]}
                valuePlaceholders={["Value..."]}
                defaultNumberOfOptions={1}
                keyValueDelimiters={[":", "="]}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <h3 className="text-emphasis text-sm">Custom Delimiters (Semicolon and Pipe)</h3>
              <p className="text-subtle text-xs">Try pasting: &ldquo;One;Two|Three&rdquo;</p>
              <MultiOptionInput<FormValues>
                fieldArrayName="customOptions"
                optionPlaceholders={["Paste here..."]}
                defaultNumberOfOptions={1}
                pasteDelimiters={[";", "|"]}
              />
            </div>
          </div>
        </div>
      </FormProvider>
    </RenderComponentWithSnippet>
  );
};
