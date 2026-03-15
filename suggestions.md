# Web App Improvement Suggestions

Ranked by learning impact.

---

## 1. In-Browser Code Runner
The Rust Playground exposes a public REST API at `https://play.rust-lang.org/execute`. Every code block could get a "Run" button that sends the snippet to the playground and renders output inline — without leaving the page. The biggest friction in learning is the context switch to an editor. Eliminating it keeps you in flow.

## 2. Task Completion Checkboxes
Progress currently only tracks visited pages. A page with 4 tasks is very different from one where all 4 are done. Checkboxes stored in localStorage per task ID would give a real completion percentage, and the sidebar could show a `✓ 3/4` badge per module so you always know what's left.

## 3. Full-Text Search
When you vaguely remember "there was something about vtables in module 7" there's no way to find it. A client-side search bar — all content is already in memory — would let you search across all concepts, task descriptions, and exercises instantly.

## 4. Copy Button on Code Blocks
Small but high-frequency. Every code block should have a one-click copy button instead of requiring manual text selection.

## 5. Per-Page Notes
A small collapsible text area at the bottom of each page, persisted in localStorage. Lets you write things like "struggled with lifetime elision, revisit" or "connects to the DNS cache exercise in module 5". Personal annotations improve retention significantly over passive reading.

## 6. "Ask AI" One-Click Copy
The Ask AI prompts in every exercise are currently plain text. A dedicated copy button on each one (styled differently from code copy buttons) would make it frictionless to grab and paste into any LLM.

## 7. Sticky Rust Quick Reference Panel
A toggleable panel with a compact Rust cheat sheet — ownership rules, type sizes, common trait names, borrow checker rules, operator precedence. Glanceable without navigating away from the current page. Like the MDN property sidebar for CSS.

## 8. Estimated Reading + Exercise Time per Page
A small badge at the top of each page: `~20 min read · 3 exercises`. Derived from word count and task count. Sets expectations and helps with session planning.
