import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogTrigger,
  DialogFooter,
  DialogHeader,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import Underline from "@tiptap/extension-underline";
import { useEditor, EditorContent } from "@tiptap/react";
import { type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Underline as UnderlineIcon,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

type ToolbarProps = {
  editor: Editor | null;
  content: string;
};
type TipTapProps = {
  onChange: (e: string) => void;
  content: string;
};
interface IMeetingNotesDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
  handleMeetingNoteSave: () => void;
}

export const MeetingNotesDialog = (props: IMeetingNotesDialog) => {
  const { t } = useLocale();

  const { isOpenDialog, setIsOpenDialog, notes, setNotes, handleMeetingNoteSave } = props;

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogTrigger>
        <Button className="min-w-40 justify-center" color="secondary">
          {t("meeting_notes")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-default font-medium">{t("meeting_notes")}</DialogTitle>
          <DialogDescription className="text-sm">{t("meeting_notes_subtitle")}</DialogDescription>
        </DialogHeader>
        <Tiptap onChange={(e) => setNotes(e)} content={notes} />
        <DialogFooter>
          <DialogClose />
          <Button onClick={handleMeetingNoteSave}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Tiptap = ({ onChange, content }: TipTapProps) => {
  const handleChange = (newContent: string) => {
    onChange(newContent);
  };
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      BulletList.configure({
        HTMLAttributes: {
          class: "list-disc px-4",
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: "list-decimal px-4",
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "flex flex-col px-4 py-3 justify-start border-b border-r border-l border-default  w-full gap-3 font-normal text-sm pt-4 rounded-bl-md rounded-br-md outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      handleChange(editor.getHTML());
    },
    content: content,
  });

  return (
    <div className="w-full">
      <Toolbar editor={editor} content={content} />
      <EditorContent editor={editor} />
    </div>
  );
};

const Toolbar = ({ editor }: ToolbarProps) => {
  if (!editor) {
    return null;
  }
  return (
    <div
      className="border-default flex w-full flex-wrap items-start justify-between gap-5
    rounded-tl-md rounded-tr-md border px-4 py-3">
      <div className="flex w-full flex-wrap items-center justify-start gap-3 md:gap-5 ">
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={editor.isActive("bold") ? "text-sky-700" : "text-subtle hover:text-sky-700"}>
          <Bold className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
          className={editor.isActive("italic") ? "text-sky-700" : "text-subtle hover:text-sky-700"}>
          <Italic className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleUnderline().run();
          }}
          className={editor.isActive("underline") ? "text-sky-700" : "text-subtle hover:text-sky-700"}>
          <UnderlineIcon className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleStrike().run();
          }}
          className={editor.isActive("strike") ? "text-sky-700" : "text-subtle hover:text-sky-700"}>
          <Strikethrough className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
          className={editor.isActive("bulletList") ? "text-sky-700" : "text-subtle hover:text-sky-700"}>
          <List className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={editor.isActive("orderedList") ? "text-sky-700" : "text-subtle hover:text-sky-700"}>
          <ListOrdered className="h-5 w-5" />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().undo().run();
          }}
          className={editor.isActive("undo") ? "text-sky-700" : "text-subtle hover:text-sky-700"}>
          <Undo className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().redo().run();
          }}
          className={editor.isActive("redo") ? "text-sky-700" : "text-subtle hover:text-sky-700"}>
          <Redo className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
