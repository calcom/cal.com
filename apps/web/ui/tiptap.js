"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import { useLayoutEffect } from "react";
import { useCallback } from "react";

const editorConfig = {
  extensions: [
    StarterKit,
    Link.configure({
      openOnClick: false,
    }),
  ],
};

const MenuBar = ({ editor }) => {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) {
      return;
    }
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="mb-2 flex items-center gap-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded text-xs font-semibold text-gray-700 hover:bg-gray-100",
          editor.isActive("bold") ? "bg-gray-200" : "bg-white"
        )}>
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 256 256">
          <path
            fill="currentColor"
            d="M177.1 114.5A48 48 0 0 0 140 36H64a12 12 0 0 0-12 12v152a12 12 0 0 0 12 12h88a52 52 0 0 0 25.1-97.5ZM76 60h64a24 24 0 0 1 0 48H76Zm76 128H76v-56h76a28 28 0 0 1 0 56Z"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded text-xs font-semibold text-gray-700 hover:bg-gray-100",
          editor.isActive("italic") ? "bg-gray-200" : "bg-white"
        )}>
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 256 256">
          <path
            fill="currentColor"
            d="M204 56a12 12 0 0 1-12 12h-31.35l-40 120H144a12 12 0 0 1 0 24H64a12 12 0 0 1 0-24h31.35l40-120H112a12 12 0 0 1 0-24h80a12 12 0 0 1 12 12Z"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={setLink}
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded text-xs font-semibold text-gray-700  hover:bg-gray-100",
          editor.isActive("link") ? "bg-gray-200" : "bg-white"
        )}
        disabled={editor.isActive("link")}>
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 256 256">
          <path
            fill="currentColor"
            d="M137.54 186.36a8 8 0 0 1 0 11.31l-9.94 10a56 56 0 0 1-79.22-79.27l24.12-24.12a56 56 0 0 1 76.81-2.28a8 8 0 1 1-10.64 12a40 40 0 0 0-54.85 1.63L59.7 139.72a40 40 0 0 0 56.58 56.58l9.94-9.94a8 8 0 0 1 11.32 0Zm70.08-138a56.08 56.08 0 0 0-79.22 0l-9.94 9.95a8 8 0 0 0 11.32 11.31l9.94-9.94a40 40 0 0 1 56.58 56.58l-24.12 24.14a40 40 0 0 1-54.85 1.6a8 8 0 1 0-10.64 12a56 56 0 0 0 76.81-2.26l24.12-24.12a56.08 56.08 0 0 0 0-79.24Z"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetLink().run()}
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed",
          editor.isActive("link") ? "bg-gray-200" : "bg-white"
        )}>
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 256 256">
          <path
            fill="currentColor"
            d="M190.63 65.37a32 32 0 0 0-45.19-.06l-11.65 12.21a8 8 0 0 1-11.58-11l11.72-12.29a1.59 1.59 0 0 1 .13-.13a48 48 0 0 1 67.88 67.88a1.59 1.59 0 0 1-.13.13l-12.29 11.72a8 8 0 0 1-11-11.58l12.21-11.65a32 32 0 0 0-.1-45.23Zm-68.42 113.11l-11.65 12.21a32 32 0 0 1-45.25-45.25l12.21-11.65a8 8 0 0 0-11-11.58l-12.33 11.72a1.59 1.59 0 0 0-.13.13a48 48 0 0 0 67.88 67.88a1.59 1.59 0 0 0 .13-.13l11.72-12.29a8 8 0 1 0-11.58-11ZM208 152h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16ZM48 104h24a8 8 0 0 0 0-16H48a8 8 0 0 0 0 16Zm112 72a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8ZM96 80a8 8 0 0 0 8-8V48a8 8 0 0 0-16 0v24a8 8 0 0 0 8 8Z"
          />
        </svg>
      </button>
    </div>
  );
};

const Tiptap = ({ value, onChange, hideInfo }) => {
  const editor = useEditor({
    ...editorConfig,
    content: value,
    onUpdate({ editor }) {
      const contentJSON = editor.getJSON();
      onChange(contentJSON);
    },
    editorProps: {
      attributes: {
        class: "prose-sm prose-a:text-indigo-600 prose-a:underline focus:outline-none",
      },
    },
  });

  useLayoutEffect(() => {
    if (editor) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(value, false);
      editor.commands.setTextSelection({ from, to });
    }
  }, [value]);

  return (
    <div>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="bio-editor max-h-[200px] overflow-scroll px-2" />
      {hideInfo ? "" : <p className="mt-1 text-sm opacity-50">Write a few sentences about yourself.</p>}
    </div>
  );
};

export default Tiptap;
