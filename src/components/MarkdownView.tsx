/**
 * C1.1 — Markdown render + önizleme.
 * C2.2 — @mention: @contact_id → kişiye link.
 */
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const UUID_RE = /@([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/g;
/** C2.3: #etiket → link to /contacts?hashtag=tag */
const HASHTAG_RE = /#([a-zA-Z0-9_\u00C0-\u024F]+)/g;

/** @contact_id → markdown link to /contacts/id */
function applyMentionLinks(text: string): string {
  return text.replace(UUID_RE, (_, id) => `[@${id}](/contacts/${id})`);
}

/** #tag → markdown link to /contacts?hashtag=tag */
function applyHashtagLinks(text: string): string {
  return text.replace(HASHTAG_RE, (_, tag) => `[#${tag}](/contacts?hashtag=${encodeURIComponent(tag)})`);
}

interface MarkdownViewProps {
  source: string;
  className?: string;
  /** C2.2: @uuid in text → link to contact (default true for note body) */
  useMentionLinks?: boolean;
}

export function MarkdownView({
  source,
  className = "",
  useMentionLinks = true,
}: MarkdownViewProps) {
  if (!source?.trim()) return null;
  let content = useMentionLinks ? applyMentionLinks(source) : source;
  content = applyHashtagLinks(content);
  return (
    <div
      className={`markdown-view text-sm ${className}`}
      style={{ wordBreak: "break-word" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            if (href?.startsWith("/")) {
              return (
                <Link to={href} {...props}>
                  {children}
                </Link>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
