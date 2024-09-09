import type { Dispatch, SetStateAction } from "react";
import "./stylesEditor.css";
export type TextEditorProps = {
    getText: () => string;
    setText: (text: string) => void;
    excludedToolbarItems?: string[];
    variables?: string[];
    height?: string;
    maxHeight?: string;
    placeholder?: string;
    disableLists?: boolean;
    updateTemplate?: boolean;
    firstRender?: boolean;
    setFirstRender?: Dispatch<SetStateAction<boolean>>;
    editable?: boolean;
};
export declare const Editor: (props: TextEditorProps) => JSX.Element;
//# sourceMappingURL=Editor.d.ts.map