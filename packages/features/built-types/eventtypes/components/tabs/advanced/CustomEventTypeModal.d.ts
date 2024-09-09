import type { FC } from "react";
import type { EventNameObjectType } from "@calcom/core/event";
interface CustomEventTypeModalProps {
    placeHolder: string;
    defaultValue: string;
    close: () => void;
    setValue: (value: string) => void;
    event: EventNameObjectType;
    isNameFieldSplit: boolean;
}
declare const CustomEventTypeModal: FC<CustomEventTypeModalProps>;
export default CustomEventTypeModal;
//# sourceMappingURL=CustomEventTypeModal.d.ts.map