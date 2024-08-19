import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { vi } from "vitest";

import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";

import { mockProps, questionUtils, setMockIntersectionObserver, setMockMatchMedia } from "./testUtils";

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

const renderComponent = () => {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const methods = useForm();
    return (
      <TooltipProvider>
        <FormProvider {...methods}>{children}</FormProvider>
      </TooltipProvider>
    );
  };

  return render(<FormBuilder {...mockProps} />, { wrapper: Wrapper });
};

const questionTypes = [
  { questionType: "email", label: "Email Field" },
  { questionType: "phone", label: "Phone Field" },
  { questionType: "address", label: "Address Field" },
  { questionType: "text", label: "Short Text Field" },
  { questionType: "number", label: "Number Field" },
  { questionType: "textarea", label: "Long Text Field" },
  { questionType: "select", label: "Select Field" },
  { questionType: "multiselect", label: "MultiSelect Field" },
  { questionType: "multiemail", label: "Multiple Emails Field" },
  { questionType: "checkbox", label: "CheckBox Group Field" },
  { questionType: "radio", label: "Radio Group Field" },
  { questionType: "boolean", label: "Checkbox Field" },
];

describe("Form Builder - Add and Edit", () => {
  beforeAll(() => {
    setMockMatchMedia();
    setMockIntersectionObserver();
  });

  beforeEach(() => {
    renderComponent();
  });

  for (const { questionType, label } of questionTypes) {
    it(`should successfully create or edit a ${label} question type in the form builder, with the option to disable the field on prefill`, async () => {
      const defaultIdentifier = `${questionType}-id`;
      const newIdentifier = `${defaultIdentifier}-edited`;

      // Add a question
      await questionUtils.addQuestion({
        questionType,
        identifier: defaultIdentifier,
        label,
        disableOnPrefill: true,
      });
      questionUtils.expectedValueForDisablePreFillCheckox(true);

      // Edit the question
      await questionUtils.editQuestion({
        identifier: newIdentifier,
        existingQuestionId: defaultIdentifier,
        disableOnPrefill: false,
      });
      questionUtils.expectedValueForDisablePreFillCheckox(false);
    });
  }
});
