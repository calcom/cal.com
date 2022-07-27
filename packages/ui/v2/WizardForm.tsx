import { useRouter } from "next/router";

import classNames from "@calcom/lib/classNames";
import Button from "@calcom/ui/v2/Button";
import Stepper from "@calcom/ui/v2/Stepper";

type DefaultStep = {
  title: string;
  description: string;
  content: JSX.Element;
  enabled?: boolean;
  isLoading: boolean;
};

function WizardForm<T extends DefaultStep>(props: { href: string; steps: T[]; containerClassname?: string }) {
  const { href, steps } = props;
  const router = useRouter();
  const step = parseInt((router.query.step as string) || "1");
  const currentStep = steps[step - 1];
  const setStep = (newStep: number) => {
    router.replace(`${href}?step=${newStep || 1}`, undefined, { shallow: true });
  };

  return (
    <div className="mx-auto print:w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mx-auto mb-8 h-8" src="https://cal.com/logo.svg" alt="Cal.com Logo" />
      <div
        className={classNames(
          "mb-8 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow print:divide-transparent print:shadow-transparent",
          props.containerClassname
        )}>
        <div className="px-4 py-5 sm:px-6">
          <h1 className="font-cal text-2xl text-gray-900">{currentStep.title}</h1>
          <p className="text-sm text-gray-500">{currentStep.description}</p>
        </div>
        <div className="print:p-none px-4 py-5 sm:p-6">{currentStep.content}</div>
        {currentStep.enabled !== false && (
          <div className="px-4 py-4 print:hidden sm:px-6">
            {step > 1 && (
              <Button
                color="secondary"
                onClick={() => {
                  setStep(step - 1);
                }}>
                Back
              </Button>
            )}

            <Button
              tabIndex={0}
              loading={currentStep.isLoading}
              type="submit"
              color="primary"
              form={`setup-step-${step}`}
              className="relative">
              {step < steps.length ? "Next" : "Finish"}
            </Button>
          </div>
        )}
      </div>
      <div className="print:hidden">
        <Stepper href={href} step={step} steps={steps} />
      </div>
    </div>
  );
}

export default WizardForm;
