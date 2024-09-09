/// <reference types="react" />
import type { ButtonColor } from "@calcom/ui";
export interface Option {
    platform?: boolean;
    teamId: number | null | undefined;
    label: string | null;
    image: string | null;
    slug: string | null;
}
export type CreateBtnProps = {
    options: Option[];
    createDialog?: () => JSX.Element;
    createFunction?: (teamId?: number, platform?: boolean) => void;
    subtitle?: string;
    buttonText?: string;
    isPending?: boolean;
    disableMobileButton?: boolean;
    "data-testid"?: string;
    color?: ButtonColor;
};
/**
 * @deprecated use CreateButtonWithTeamsList instead
 */
export declare function CreateButton(props: CreateBtnProps): JSX.Element;
//# sourceMappingURL=CreateButton.d.ts.map