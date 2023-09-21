import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";

const RichContentParser = ({ content = "" }) => {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure()],
    editable: false,
    content,
  });
  return <EditorContent id="bio" editor={editor} />;
};

export default RichContentParser;
