import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";

type DefaultStep = {
  title: string;
};

function Stepper<T extends DefaultStep>(props: {
  href: string;
  step: number;
  steps: T[];
  disableSteps?: boolean;
  stepLabel?: (currentStep: number, totalSteps: number) => string;
}) {
  const {
    href,
    steps,
    stepLabel = (currentStep, totalSteps) => `Step ${currentStep} of ${totalSteps}`,
  } = props;
  const [stepperRef] = useAutoAnimate<HTMLOListElement>();
  return (
    <>
      {steps.length > 1 && (
        <nav className="flex items-center justify-center" aria-label="Progress">
          <p className="text-sm font-medium">{stepLabel(props.step, steps.length)}</p>
          <ol role="list" className="ml-8 flex items-center space-x-5" ref={stepperRef}>
            {steps.map((mapStep, index) => (
              <li key={mapStep.title}>
                <Link
                  href={props.disableSteps ? "#" : `${href}?step=${index + 1}`}
                  shallow
                  replace
                  className={
                    index + 1 < props.step
                      ? "hover:bg-inverted block h-2.5 w-2.5 rounded-full bg-gray-600"
                      : index + 1 === props.step
                      ? "relative flex items-center justify-center"
                      : "bg-emphasis block h-2.5 w-2.5 rounded-full hover:bg-gray-400"
                  }
                  aria-current={index + 1 === props.step ? "step" : undefined}>
                  <span className="sr-only">{mapStep.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </>
  );
}

export default Stepper;
