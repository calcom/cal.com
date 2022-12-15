import { useRouter } from "next/router";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button, Stepper } from "../..";

type DefaultStep = {
  title: string;
  description: string;
  content: JSX.Element;
  enabled?: boolean;
  isLoading: boolean;
};

function WizardForm<T extends DefaultStep>(props: {
  href: string;
  steps: T[];
  disableNavigation?: boolean;
  containerClassname?: string;
}) {
  const { href, steps } = props;
  const { t } = useLocale();
  const router = useRouter();
  const step = parseInt((router.query.step as string) || "1");
  const currentStep = steps[step - 1];
  const setStep = (newStep: number) => {
    router.replace(`${href}?step=${newStep || 1}`, undefined, { shallow: true });
  };

  return (
    <div className="mx-auto mt-4 print:w-full">
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
        {!props.disableNavigation && (
          <>
            {currentStep.enabled !== false && (
              <div className="flex justify-end px-4 py-4 print:hidden sm:px-6">
                {step > 1 && (
                  <Button
                    color="secondary"
                    onClick={() => {
                      setStep(step - 1);
                    }}>
                    {t("prev_step")}
                  </Button>
                )}

                <Button
                  tabIndex={0}
                  loading={currentStep.isLoading}
                  type="submit"
                  color="primary"
                  form={`wizard-step-${step}`}
                  className="relative ml-2"
                  onClick={() => {
                    setStep(step + 1);
                  }}>
                  {step < steps.length ? t("next_step_text") : t("finish")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {!props.disableNavigation && (
        <div className="print:hidden">
          <Stepper href={href} step={step} steps={steps} disableSteps />
        </div>
      )}
    </div>
  );
}

export default WizardForm;
