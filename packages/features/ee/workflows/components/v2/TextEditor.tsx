import { EditorState, convertToRaw, ContentState } from "draft-js";
import draftToHtml from "draftjs-to-html";
import dynamic from "next/dynamic";
import { useState } from "react";
import { EditorProps } from "react-draft-wysiwyg";

import "./styles.css";

const Editor = dynamic<EditorProps>(() => import("react-draft-wysiwyg").then((mod) => mod.Editor), {
  ssr: false,
});

const htmlToDraft = typeof window === "object" && require("html-to-draftjs").default;

function TextEditor() {
  const html = "<p>Hey this <strong>editor</strong> rocks 😀</p>";

  const contentBlock = htmlToDraft(html);
  const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);

  const [editorState, setEditorState] = useState(EditorState.createWithContent(contentState));

  return (
    <div>
      <Editor
        editorState={editorState}
        wrapperClassName="border border-gray-300 rounded-md"
        editorClassName=" p-3 -mt-3 bg-white rounded-md text-sm"
        onEditorStateChange={setEditorState}
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
      {/* <textarea
        disabled
        value={draftToHtml(convertToRaw(editorState.getCurrentContent()))}
      /> */}
    </div>
  );
}

export default TextEditor;
