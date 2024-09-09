import type { Dispatch, SetStateAction } from "react";
import { Steps } from "../../..";
type DefaultStep = {
    title: string;
    containerClassname?: string;
    contentClassname?: string;
    description: string;
    content?: ((setIsPending: Dispatch<SetStateAction<boolean>>) => JSX.Element) | JSX.Element;
    isEnabled?: boolean;
    isPending?: boolean;
};
declare function WizardForm<T extends DefaultStep>(props: {
    href: string;
    steps: T[];
    disableNavigation?: boolean;
    containerClassname?: string;
    prevLabel?: string;
    nextLabel?: string;
    finishLabel?: string;
    stepLabel?: React.ComponentProps<typeof Steps>["stepLabel"];
}): JSX.Element;
export default WizardForm;
//# sourceMappingURL=WizardForm.d.ts.map