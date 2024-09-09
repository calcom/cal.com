/// <reference types="react" />
type DefaultStep = {
    title: string;
};
declare function Stepper<T extends DefaultStep>(props: {
    href: string;
    step: number;
    steps: T[];
    disableSteps?: boolean;
    stepLabel?: (currentStep: number, totalSteps: number) => string;
}): JSX.Element;
export default Stepper;
//# sourceMappingURL=Stepper.d.ts.map