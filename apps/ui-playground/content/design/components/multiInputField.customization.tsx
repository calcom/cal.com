"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useForm, FormProvider } from "react-hook-form";

import { MultiOptionInput } from "@calcom/ui/components/form";

type FormValues = {
  customPlaceholders: Array<{ label: string; id: string }>;
  noMoveButtons: Array<{ label: string; id: string }>;
  customLabel: Array<{ label: string; id: string }>;
  keyValuePairs: Array<{ label: string; value: string; id: string }>;
};

export const CustomizationExample: React.FC = () => {
  const methods = useForm<FormValues>();

  return (
    <RenderComponentWithSnippet>
      <FormProvider {...methods}>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <h3 className="text-emphasis text-sm">Key-Value Pairs</h3>
              <p className="text-subtle text-xs">Allows inputting keys and values</p>
              <MultiOptionInput<FormValues>
                fieldArrayName="keyValuePairs"
                keyValueMode
                keyLabel="Environment Variable"
                valueLabel="Value"
                optionPlaceholders={["NODE_ENV", "PORT", "DATABASE_URL"]}
                valuePlaceholders={["production", "3000", "postgres://..."]}
                defaultNumberOfOptions={3}
                keyValueDelimiters={[":", "="]}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <h3 className="text-emphasis text-sm">Custom Placeholders</h3>
              <MultiOptionInput<FormValues>
                fieldArrayName="customPlaceholders"
                optionPlaceholders={["Enter your name", "Enter your email", "Enter your phone"]}
                defaultNumberOfOptions={3}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <h3 className="text-emphasis text-sm">Without Move Buttons</h3>
              <MultiOptionInput<FormValues>
                fieldArrayName="noMoveButtons"
                optionPlaceholders={["Static option 1", "Static option 2"]}
                defaultNumberOfOptions={2}
                showMoveButtons={false}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <h3 className="text-emphasis text-sm">Custom Add Button Label</h3>
              <MultiOptionInput<FormValues>
                fieldArrayName="customLabel"
                optionPlaceholders={["Social media link"]}
                defaultNumberOfOptions={1}
                addOptionLabel="Add another social media link"
              />
            </div>
          </div>
        </div>
      </FormProvider>
    </RenderComponentWithSnippet>
  );
};
