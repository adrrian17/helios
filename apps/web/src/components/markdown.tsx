import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@helios/ui/components/tabs";
import { Textarea } from "@helios/ui/components/textarea";
import { cn } from "@helios/ui/lib/utils";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const caretAtEnd = (textarea: HTMLTextAreaElement | null) => {
  textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
};

const remarkPlugins = [remarkGfm];

const components: Components = {
  a: ({ node: _node, children, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
};

/**
 * Renders Markdown as React elements. Raw HTML in the source is never parsed
 * (no rehype-raw), and unsafe link protocols such as `javascript:` are dropped.
 */
export const Markdown = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => (
  <div className={cn("markdown", className)}>
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  </div>
);

/** A Markdown textarea with a rendered preview; Cmd/Ctrl+Enter submits and Escape cancels. */
export const MarkdownEditor = ({
  label,
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  autoFocus = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) => (
  <Tabs defaultValue="write">
    <TabsList variant="line" className="h-7 max-md:h-auto">
      <TabsTrigger value="write" className="max-md:min-h-11">
        Write
      </TabsTrigger>
      <TabsTrigger value="preview" className="max-md:min-h-11">
        Preview
      </TabsTrigger>
    </TabsList>
    <TabsContent value="write">
      <Textarea
        aria-label={label}
        autoFocus={autoFocus}
        // Opening an editor on existing text puts the caret after it, ready to add more.
        ref={autoFocus ? caretAtEnd : undefined}
        placeholder={placeholder}
        className={cn("max-h-[60svh] min-h-24", className)}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmit();
          }

          if (event.key === "Escape" && onCancel !== undefined) {
            event.preventDefault();
            onCancel();
          }
        }}
      />
    </TabsContent>
    <TabsContent value="preview">
      <div className="min-h-24 rounded-lg border px-2.5 py-2">
        {value.trim() === "" ? (
          <p className="text-muted-foreground text-sm">Nothing to preview.</p>
        ) : (
          <Markdown>{value}</Markdown>
        )}
      </div>
    </TabsContent>
  </Tabs>
);
