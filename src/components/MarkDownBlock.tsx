import ReactMarkdown from "react-markdown";
import type { SyntaxHighlighterProps } from "react-syntax-highlighter";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

export default function MarkdownBlock({ content }: { content: string }) {
  const preStyle = atomDark['pre[class*="language-"]'] || {};
  const codeStyle = atomDark['code[class*="language-"]'] || {};

  const backgroundColor = preStyle.background || codeStyle.background;
  console.log("🚀 ~ MarkdownBlock ~ backgroundColor:", backgroundColor);
  const textColor = preStyle.color || codeStyle.color;
  const keywordColor = atomDark["keyword"]?.color;
  const stringColor = atomDark["string"]?.color;
  const commentColor = atomDark["comment"]?.color;
  const functionColor = atomDark["function"]?.color;
  const numberColor = atomDark["number"]?.color;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !String(children).includes("\n");

          return match || !isInline ? (
            <SyntaxHighlighter
              style={atomDark as SyntaxHighlighterProps["style"]}
              language={match ? match[1] : "text"}
              PreTag="div"
              className="rounded-xl text-sm"
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code
              style={{
                backgroundColor: backgroundColor as string,
                color: textColor,
              }}
              className="text-sm font-mono !p-0.5 rounded-md"
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
