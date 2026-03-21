"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", class: "text-clay underline" },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync when editing existing content
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const active = (name: string, attrs?: object) =>
    editor.isActive(name, attrs)
      ? "bg-soil text-cream"
      : "text-soil/60 hover:bg-linen hover:text-soil";

  const btn = (name: string, attrs?: object) =>
    `px-2.5 py-1 rounded text-sm font-medium transition-colors ${active(name, attrs)}`;

  return (
    <div className="border border-linen rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-linen bg-linen/40">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn("bold")}>
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn("italic")}>
          <em>I</em>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn("underline")}>
          <u>U</u>
        </button>

        <span className="w-px h-4 bg-linen mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn("heading", { level: 2 })}>
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn("heading", { level: 3 })}>
          H3
        </button>

        <span className="w-px h-4 bg-linen mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn("bulletList")}>
          • List
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn("orderedList")}>
          1. List
        </button>

        <span className="w-px h-4 bg-linen mx-1" />

        <button
          type="button"
          onClick={() => {
            const url = window.prompt("URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={btn("link")}
        >
          Link
        </button>
        {editor.isActive("link") && (
          <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className={btn("")}>
            Unlink
          </button>
        )}
      </div>

      <EditorContent
        editor={editor}
        className="p-4 min-h-[140px] text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror_h2]:font-serif [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:font-serif [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_a]:text-clay [&_.ProseMirror_a]:underline"
      />
    </div>
  );
}
