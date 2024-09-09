/// <reference types="react" />
import type { ButtonColor } from "../..";
type BannerUploaderProps = {
    id: string;
    buttonMsg: string;
    handleAvatarChange: (imageSrc: string) => void;
    imageSrc?: string;
    target: string;
    triggerButtonColor?: ButtonColor;
    uploadInstruction?: string;
    disabled?: boolean;
    height: number;
    width: number;
};
export default function BannerUploader({ target, id, buttonMsg, handleAvatarChange, triggerButtonColor, imageSrc, uploadInstruction, disabled, height, width, }: BannerUploaderProps): JSX.Element;
export {};
//# sourceMappingURL=BannerUploader.d.ts.map