/// <reference types="react" />
import type { ButtonColor } from "../..";
type ImageUploaderProps = {
    id: string;
    buttonMsg: string;
    handleAvatarChange: (imageSrc: string) => void;
    imageSrc?: string;
    target: string;
    triggerButtonColor?: ButtonColor;
    uploadInstruction?: string;
    disabled?: boolean;
    testId?: string;
};
export default function ImageUploader({ target, id, buttonMsg, handleAvatarChange, triggerButtonColor, imageSrc, uploadInstruction, disabled, testId, }: ImageUploaderProps): JSX.Element;
export {};
//# sourceMappingURL=ImageUploader.d.ts.map