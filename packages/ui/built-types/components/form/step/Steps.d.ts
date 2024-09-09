/// <reference types="react" />
type StepWithNav = {
    maxSteps: number;
    currentStep: number;
    navigateToStep: (step: number) => void;
    disableNavigation?: false;
    stepLabel?: (currentStep: number, maxSteps: number) => string;
};
type StepWithoutNav = {
    maxSteps: number;
    currentStep: number;
    navigateToStep?: undefined;
    disableNavigation: true;
    stepLabel?: (currentStep: number, maxSteps: number) => string;
};
type StepsProps = StepWithNav | StepWithoutNav;
declare const Steps: (props: StepsProps) => JSX.Element;
export { Steps };
//# sourceMappingURL=Steps.d.ts.map