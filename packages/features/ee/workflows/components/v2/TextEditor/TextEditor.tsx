/* eslint-disable @typescript-eslint/no-var-requires */
import { EditorState, Modifier, ContentState, convertToRaw } from "draft-js";
import draftToHtml from "draftjs-to-html";
import dynamic from "next/dynamic";
import { useState, Dispatch, SetStateAction } from "react";
import { EditorProps } from "react-draft-wysiwyg";
import { UseFormReturn } from "react-hook-form";

import { FormValues } from "../../../pages/v2/workflow";
import { AddVariablesDropdown } from "../AddVariablesDropdown";
import "./styles.css";

const Editor = dynamic<EditorProps>(() => import("react-draft-wysiwyg").then((mod) => mod.Editor), {
  ssr: false,
});

const htmlToDraft = typeof window === "object" && require("html-to-draftjs").default;

type TextEditorProps = {
  form: UseFormReturn<FormValues>;
  stepNumber: number;
};

function TextEditor({ form, stepNumber }: TextEditorProps) {
  const contentBlock = htmlToDraft(form.getValues(`steps.${stepNumber - 1}.reminderBody`) || "");
  const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);

  const [editorState, setEditorState] = useState(EditorState.createWithContent(contentState));

  return (
    <>
      <Editor
        editorState={editorState}
        wrapperClassName="border border-gray-300 rounded-md "
        editorClassName=" p-3 -mt-3 bg-white rounded-md text-sm hover:border-gray-400"
        onEditorStateChange={setEditorState}
        onChange={() => {
          form.clearErrors(`steps.${stepNumber - 1}.reminderBody`);
          const value = draftToHtml(convertToRaw(editorState.getCurrentContent()))
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">")
            .replaceAll("<p></p>", "<br/>");

          form.setValue(`steps.${stepNumber - 1}.reminderBody`, value.trim() !== "<br/>" ? value : null);
        }}
        toolbarCustomButtons={[
          <AddVariablesOption
            key={stepNumber}
            form={form}
            stepNumber={stepNumber}
            editorState={editorState}
            setEditorState={setEditorState}
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
    </>
  );
}

type AddVariablesProps = {
  editorState: EditorState;
  setEditorState: Dispatch<SetStateAction<EditorState>>;
  form: UseFormReturn<FormValues>;
  stepNumber: number;
};

function AddVariablesOption({ editorState, setEditorState, form, stepNumber }: AddVariablesProps) {
  const addVariable = (isEmailSubject: boolean, variable: string) => {
    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      `{${variable.toUpperCase().replace(/ /g, "_")}}`,
      editorState.getCurrentInlineStyle()
    );
    const newEditorState = EditorState.push(editorState, contentState, "insert-characters");
    setEditorState(newEditorState);

    const value = draftToHtml(convertToRaw(newEditorState.getCurrentContent()));
    form.setValue(`steps.${stepNumber - 1}.reminderBody`, value);
  };

  return (
    <div className="-mt-[1px]">
      <AddVariablesDropdown addVariable={addVariable} isEmailSubject={false} />
    </div>
  );
}

export default TextEditor;
