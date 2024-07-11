import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { vi } from "vitest";

import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";

import { mockProps, questionUtils, setMockIntersectionObserver, setMockMatchMedia } from "./utils";

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

describe("MultiSelect Question", () => {
  beforeEach(() => {
    renderComponent();
  });

  beforeAll(() => {
    setMockMatchMedia();
    setMockIntersectionObserver();
  });

  const questionTypes = [
    { questionType: "email", label: "Email Field" },
    { questionType: "phone", label: "Phone Field" },
    { questionType: "address", label: "Address Field" },
    { questionType: "text", label: "Short Text Field" },
    { questionType: "number", label: "Number Field" },
    { questionType: "textarea", label: "LongText Field" },
    { questionType: "select", label: "Select Field" },
    { questionType: "multiselect", label: "MultiSelect Field" },
    { questionType: "multiemail", label: "Multiple Emails Field" },
    { questionType: "checkbox", label: "CheckBox Group Field" },
    { questionType: "radio", label: "Radio Group Field" },
    { questionType: "boolean", label: "Checkbox Field" },
  ];

  for (const { questionType, label } of questionTypes) {
    it(`Should handle ${label}`, async () => {
      const defaultIdentifier = `${questionType}-id`;
      const newIdentifier = `${defaultIdentifier}-edited`;

      await questionUtils.addQuestion({
        questionType,
        identifier: defaultIdentifier,
        label,
      });

      await questionUtils.editQuestion({
        identifier: newIdentifier,
        existingQuestionId: defaultIdentifier,
      });

      await questionUtils.requiredAndOptionalQuestion();

      await questionUtils.hideQuestion();

      await questionUtils.deleteQuestion(newIdentifier);
    });
  }
});
