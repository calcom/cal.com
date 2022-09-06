import { ComponentMeta } from "@storybook/react";
import { useState } from "react";

import FormStep from "@calcom/ui/v2/core/form/FormStep";

export default {
  title: "Form Step",
  component: FormStep,
} as ComponentMeta<typeof FormStep>;

export const Default = () => {
  const STEPS = 4;
  const [currentStep, setCurrentStep] = useState(1);
  return (
    <div className="flex flex-col items-center justify-center space-y-14 p-20">
      <div className="w-1/2">
        <FormStep steps={STEPS} currentStep={currentStep} />
        <div className="flex space-x-2 pt-4">
          <button onClick={() => currentStep - 1 > 0 && setCurrentStep((old) => old - 1)}>Previous</button>
          <button onClick={() => currentStep + 1 < STEPS + 1 && setCurrentStep((old) => old + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
