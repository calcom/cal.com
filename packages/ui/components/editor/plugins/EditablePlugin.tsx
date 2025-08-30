import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export default function EditablePlugin({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext();
  editor.setEditable(editable);
  return null;
}
