/* eslint-disable @typescript-eslint/no-var-requires */
import { EditorState, Modifier, ContentState, convertToRaw } from "draft-js";
import draftToHtml from "draftjs-to-html";
import { FormValues } from "ee/workflows/pages/v2/workflow";
import dynamic from "next/dynamic";
import { useState, Dispatch, SetStateAction } from "react";
import { EditorProps } from "react-draft-wysiwyg";
import { UseFormReturn } from "react-hook-form";

import { AddVariablesDropdown } from "../AddVariablesDropdown";
import "./styles.css";

const Editor = dynamic<EditorProps>(() => import("react-draft-wysiwyg").then((mod) => mod.Editor), {
  ssr: false,
});

const htmlToDraft = typeof window === "object" && require("html-to-draftjs").default;

type TextEditorProps = {
  addVariable: (isEmailSubject: boolean, variable: string) => void;
  form: UseFormReturn<FormValues>;
  stepNumber: number;
};

function TextEditor(props: TextEditorProps) {
  const contentBlock = htmlToDraft(props.form.getValues(`steps.${props.stepNumber - 1}.reminderBody`) || "");
  const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);

  const [editorState, setEditorState] = useState(EditorState.createWithContent(contentState));

  return (
    <div>
      <Editor
        editorState={editorState}
        wrapperClassName="border border-gray-300 rounded-md"
        editorClassName=" p-3 -mt-3 bg-white rounded-md text-sm"
        onEditorStateChange={setEditorState}
        onChange={() => {
          props.form.setValue(
            `steps.${props.stepNumber - 1}.reminderBody`,
            draftToHtml(convertToRaw(editorState.getCurrentContent()))
              .replaceAll("&lt;", "<")
              .replaceAll("&gt;", ">")
          );
        }}
        toolbarCustomButtons={[
          <CustomOption
            key={props.stepNumber}
            editorState={editorState}
            setEditorState={setEditorState}
            addVariable={props.addVariable}
          />,
        ]}
        toolbar={{
          options: ["inline", "fontSize", "list"],
          inline: {
            options: ["bold", "italic"],
          },
          list: {
            inDropdown: true,
            options: ["unordered", "ordered"],
          },
        }}
      />
    </div>
  );
}

type Props = {
  editorState: EditorState;
  setEditorState: Dispatch<SetStateAction<EditorState>>;
  addVariable: (isEmailSubject: boolean, variable: string) => void;
};

function CustomOption({ editorState, setEditorState }: Props) {
  const addVariable = (isEmailSubject: boolean, variable: string) => {
    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      `{${variable.toUpperCase().replace(/ /g, "_")}}`,
      editorState.getCurrentInlineStyle()
    );
    setEditorState(EditorState.push(editorState, contentState, "insert-characters"));
  };

  return (
    <div className="-mt-[1px]">
      <AddVariablesDropdown addVariable={addVariable} isEmailSubject={false} />
    </div>
  );
}

export default TextEditor;
