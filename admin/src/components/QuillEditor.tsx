import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  ['clean'],
];

export function QuillEditor({ value, onChange, placeholder, minHeight = 180 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track whether the next setContents came from outside (to avoid cursor jump)
  const isInternalChange = useRef(false);
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const q = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder: placeholder ?? 'Ürün açıklaması...',
      modules: { toolbar: TOOLBAR },
    });

    quillRef.current = q;

    // Set initial content
    if (value) {
      q.clipboard.dangerouslyPasteHTML(value);
    }

    q.on('text-change', () => {
      isInternalChange.current = true;
      const html = q.getSemanticHTML();
      // Quill wraps empty editor in <p><br></p> — treat as empty string
      const cleaned = html === '<p><br></p>' ? '' : html;
      lastExternalValue.current = cleaned;
      onChangeRef.current(cleaned);
    });

    return () => {
      quillRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. form reset) without disturbing cursor
  useEffect(() => {
    const q = quillRef.current;
    if (!q || isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      q.clipboard.dangerouslyPasteHTML(value ?? '');
    }
  }, [value]);

  return (
    <div className="quill-wrapper rounded border border-stroke dark:border-strokedark overflow-hidden">
      <style>{`
        .quill-wrapper .ql-toolbar {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .dark .quill-wrapper .ql-toolbar {
          background: #1e2a3a;
          border-bottom-color: #2d3d52;
        }
        .dark .quill-wrapper .ql-toolbar .ql-stroke { stroke: #94a3b8; }
        .dark .quill-wrapper .ql-toolbar .ql-fill  { fill:   #94a3b8; }
        .dark .quill-wrapper .ql-toolbar .ql-picker-label { color: #94a3b8; }
        .dark .quill-wrapper .ql-toolbar button:hover .ql-stroke,
        .dark .quill-wrapper .ql-toolbar button.ql-active .ql-stroke { stroke: #fff; }
        .dark .quill-wrapper .ql-toolbar button:hover .ql-fill,
        .dark .quill-wrapper .ql-toolbar button.ql-active .ql-fill  { fill:   #fff; }
        .quill-wrapper .ql-container {
          border: none;
          font-size: 0.875rem;
          font-family: inherit;
        }
        .dark .quill-wrapper .ql-container { background: #1a2535; color: #e2e8f0; }
        .dark .quill-wrapper .ql-editor.ql-blank::before { color: #64748b; }
        .quill-wrapper .ql-editor { min-height: ${minHeight}px; }
        .quill-wrapper .ql-editor p { margin-bottom: 0.5rem; }
      `}</style>
      <div ref={containerRef} />
    </div>
  );
}
