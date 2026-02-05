/**
 * C1.1 — Markdown render + önizleme.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewProps {
  source: string;
  className?: string;
}

export function MarkdownView({ source, className = "" }: MarkdownViewProps) {
  if (!source?.trim()) return null;
  return (
    <div
      className={`markdown-view text-sm ${className}`}
      style={{ wordBreak: "break-word" }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
