import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import './Reader.css'

export default function Reader({ page }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [page.id])

  return (
    <main className="reader-scroll" ref={scrollRef}>
      <article className="reader-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // pre handles ALL block code — adds wrapper div + language label
            pre({ children }) {
              const codeEl = React.Children.toArray(children).find(
                c => React.isValidElement(c) && c.type === 'code'
              )
              const lang = /language-(\w+)/.exec(codeEl?.props?.className || '')?.[1]
              return (
                <div className="code-block-wrap">
                  {lang && <span className="code-lang">{lang}</span>}
                  <pre>{children}</pre>
                </div>
              )
            },
            // code only needs to handle inline code — block code is inside pre above
            code({ node, className, children, ...props }) {
              if (className) {
                // has language class → block code inside pre, render normally
                return <code className={className} {...props}>{children}</code>
              }
              const text = Array.isArray(children) ? children.join('') : String(children ?? '')
              if (text.includes('\n')) {
                // unlanguaged block code — render plainly, pre handles the box
                return <code {...props}>{children}</code>
              }
              // no class, no newline → inline code
              return <code className="inline-code" {...props}>{children}</code>
            },
            table({ children }) {
              return (
                <div className="table-scroll">
                  <table>{children}</table>
                </div>
              )
            },
          }}
        >
          {page.content}
        </ReactMarkdown>
      </article>
    </main>
  )
}
