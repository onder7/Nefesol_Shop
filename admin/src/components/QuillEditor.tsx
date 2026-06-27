import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { api } from '../lib/api';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['link', 'image'],
  ['blockquote', 'code-block'],
  ['clean'],
];

const EMPTY = '<p><br></p>';

export function QuillEditor({ value, onChange, placeholder, minHeight = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const isInternalChange = useRef(false);
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const q = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder: placeholder ?? 'İçerik yazın...',
      modules: {
        toolbar: {
          container: TOOLBAR,
          handlers: {
            image: () => {
              const input = document.createElement('input');
              input.setAttribute('type', 'file');
              input.setAttribute('accept', 'image/*');
              input.click();
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                try {
                  const res = await api.upload<{ success: boolean; data: { url: string } }>(
                    '/admin/upload',
                    file,
                  );
                  const url = res?.data?.url;
                  if (!url) return;
                  const range = q.getSelection(true);
                  q.insertEmbed(range.index, 'image', url);
                  q.setSelection(range.index + 1, 0);
                } catch {
                  alert('Resim yüklenemedi.');
                }
              };
            },
          },
        },
      },
    });

    quillRef.current = q;

    // innerHTML kullanarak yükleme — resim width'lerini korur
    if (value) {
      q.root.innerHTML = value;
    }

    q.on('text-change', () => {
      isInternalChange.current = true;
      const html = q.root.innerHTML;
      const cleaned = html === EMPTY ? '' : html;
      lastExternalValue.current = cleaned;
      onChangeRef.current(cleaned);
    });

    // ── Resim Resize ──────────────────────────────────────────────
    const editor = q.root;
    const qlContainer = editor.parentElement as HTMLElement;
    let overlay: HTMLDivElement | null = null;
    let activeImg: HTMLImageElement | null = null;

    const updateOverlayPos = () => {
      if (!overlay || !activeImg) return;
      const ir = activeImg.getBoundingClientRect();
      const cr = qlContainer.getBoundingClientRect();
      overlay.style.top = `${ir.top - cr.top + qlContainer.scrollTop}px`;
      overlay.style.left = `${ir.left - cr.left + qlContainer.scrollLeft}px`;
      overlay.style.width = `${ir.width}px`;
      overlay.style.height = `${ir.height}px`;
    };

    const removeOverlay = () => {
      overlay?.remove();
      overlay = null;
      activeImg = null;
    };

    const showOverlay = (img: HTMLImageElement) => {
      removeOverlay();
      activeImg = img;

      const el = document.createElement('div');
      el.style.cssText =
        'position:absolute;border:2px dashed #3C50E0;pointer-events:none;z-index:50;box-sizing:border-box;';

      // 4 köşe tutacağı
      const corners = [
        { pos: 'top:-5px;left:-5px', cursor: 'nw-resize', isRight: false },
        { pos: 'top:-5px;right:-5px', cursor: 'ne-resize', isRight: true },
        { pos: 'bottom:-5px;right:-5px', cursor: 'se-resize', isRight: true },
        { pos: 'bottom:-5px;left:-5px', cursor: 'sw-resize', isRight: false },
      ];

      corners.forEach(({ pos, cursor, isRight }) => {
        const handle = document.createElement('div');
        handle.style.cssText = `position:absolute;width:10px;height:10px;background:#fff;border:2px solid #3C50E0;border-radius:50%;pointer-events:all;cursor:${cursor};${pos};`;

        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const startX = e.clientX;
          const startW = img.getBoundingClientRect().width;
          let currentW = startW;

          const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            currentW = Math.max(50, isRight ? startW + dx : startW - dx);
            img.style.width = `${currentW}px`;
            img.style.height = 'auto';
            updateOverlayPos();
          };

          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            img.style.width = `${Math.round(currentW)}px`;
            img.style.height = 'auto';
            updateOverlayPos();
            // onChange'e innerHTML ile bildir — width korunur
            const html = q.root.innerHTML;
            isInternalChange.current = true;
            const cleaned = html === EMPTY ? '' : html;
            lastExternalValue.current = cleaned;
            onChangeRef.current(cleaned);
          };

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });

        el.appendChild(handle);
      });

      qlContainer.appendChild(el);
      overlay = el;
      updateOverlayPos();
    };

    const onEditorClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        showOverlay(target as HTMLImageElement);
      } else if (!overlay?.contains(target)) {
        removeOverlay();
      }
    };

    const onDocClick = (e: MouseEvent) => {
      if (!qlContainer.contains(e.target as Node)) {
        removeOverlay();
      }
    };

    editor.addEventListener('click', onEditorClick);
    document.addEventListener('click', onDocClick);

    return () => {
      editor.removeEventListener('click', onEditorClick);
      document.removeEventListener('click', onDocClick as EventListener);
      removeOverlay();
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dışarıdan gelen value değişikliklerini editöre yansıt
  useEffect(() => {
    const q = quillRef.current;
    if (!q || isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      q.root.innerHTML = value ?? '';
    }
  }, [value]);

  return (
    <div className="quill-wrapper rounded border border-stroke dark:border-strokedark overflow-hidden">
      <style>{`
        .quill-wrapper .ql-toolbar {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-wrap: wrap;
        }
        .dark .quill-wrapper .ql-toolbar {
          background: #1e2a3a;
          border-bottom-color: #2d3d52;
        }
        .dark .quill-wrapper .ql-toolbar .ql-stroke { stroke: #94a3b8; }
        .dark .quill-wrapper .ql-toolbar .ql-fill  { fill:   #94a3b8; }
        .dark .quill-wrapper .ql-toolbar .ql-picker-label { color: #94a3b8; }
        .dark .quill-wrapper .ql-toolbar .ql-picker-options { background: #1e2a3a; border-color: #2d3d52; }
        .dark .quill-wrapper .ql-toolbar .ql-picker-item { color: #94a3b8; }
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
        .quill-wrapper .ql-editor img {
          max-width: 100%;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
          cursor: pointer;
          display: block;
        }
        .quill-wrapper .ql-editor img.selected { outline: 2px dashed #3C50E0; }
        .quill-wrapper .ql-editor blockquote { border-left: 3px solid #3C50E0; padding-left: 1rem; margin: 0 0 .75rem; color: #64748b; font-style: italic; }
        .quill-wrapper .ql-editor pre.ql-syntax { background: #1e293b; color: #e2e8f0; padding: .75rem 1rem; border-radius: .375rem; font-size: .8rem; overflow-x: auto; }
      `}</style>
      <div ref={containerRef} />
    </div>
  );
}
