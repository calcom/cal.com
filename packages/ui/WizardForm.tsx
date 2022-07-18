import { useRouter } from "next/router";

import Stepper from "./Stepper";

type DefaultStep = {
  title: string;
  description: string;
  content: JSX.Element;
  enabled?: boolean;
};

function WizardForm<T extends DefaultStep>(props: { href: string; steps: T[] }) {
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
      <div className="mb-8 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow print:divide-transparent print:shadow-transparent">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="font-cal text-2xl text-gray-900">{currentStep.title}</h1>
          <p className="text-sm text-gray-500">{currentStep.description}</p>
        </div>
        <div className="print:p-none px-4 py-5 sm:p-6">{currentStep.content}</div>
        {currentStep.enabled !== false && (
          <div className="px-4 py-4 print:hidden sm:px-6">
            {step > 1 && (
              <button
                onClick={() => {
                  setStep(step - 1);
                }}
                className="mr-2 rounded-sm bg-gray-100 px-4 py-2 text-gray-900">
                Back
              </button>
            )}

            <label
              tabIndex={0}
              htmlFor={`submit${href.replace(/\//g, "-")}-step-${step}`}
              className="cursor-pointer rounded-sm bg-gray-900 px-4 py-2 text-white hover:bg-opacity-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1">
              {step < steps.length ? "Next" : "Finish"}
            </label>
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
