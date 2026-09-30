/**
 * Remark plugin: Obsidian-style `==highlight==` -> <mark>highlight</mark>.
 *
 * Lets the same source render highlighted in Obsidian (which supports `==` natively)
 * and on the site. Styling lives on `mark` in src/css/custom.css.
 *
 * Only `text` nodes are visited, so `==` inside inline code or fenced code blocks is
 * left alone — those are `inlineCode` / `code` nodes, not `text`.
 *
 * The content must not start or end with whitespace. That keeps prose like
 * "if x == y and a == b" from being swallowed as one highlight, which a naive
 * `==(.+)==` would do.
 */
const HIGHLIGHT = /==(?![\s=])([^=\n]*[^\s=])==/g;

/** Number of hand-drawn shape variants defined in custom.css (.mark-v0 … .mark-vN). */
const VARIANTS = 5;

/**
 * Pick a shape variant from the highlighted text itself.
 *
 * CSS can't do this alone: :nth-of-type counts siblings within one parent, so a
 * <mark> alone in its own paragraph is always "the first one" and every highlight
 * ends up identical. Hashing the content gives variety across the page while
 * staying deterministic — the same phrase always gets the same shape, so builds
 * are reproducible and nothing shifts around between deploys.
 */
function variantFor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % VARIANTS;
}

export default function remarkHighlight() {
  return async (root) => {
    const { visit, SKIP } = await import('unist-util-visit');

    // Links get a shape variant too, so a list of them doesn't read as identical
    // stamps. Done via hProperties rather than by rewriting the node: Docusaurus's
    // own plugins (resolveMarkdownLinks / transformLinks) need these to stay real
    // `link` nodes, or relative .md hrefs stop resolving.
    visit(root, 'link', (node) => {
      const label = (node.children ?? [])
        .map((child) => child.value ?? '')
        .join('');
      const variant = `mark-v${variantFor(label || node.url || '')}`;
      node.data = node.data ?? {};
      const props = node.data.hProperties ?? {};
      node.data.hProperties = {
        ...props,
        className: [props.className, variant].filter(Boolean).join(' '),
      };
    });

    visit(root, 'text', (node, index, parent) => {
      if (!parent || index === null || !node.value.includes('==')) {
        return undefined;
      }

      const parts = [];
      let cursor = 0;
      let match;
      HIGHLIGHT.lastIndex = 0;

      while ((match = HIGHLIGHT.exec(node.value)) !== null) {
        if (match.index > cursor) {
          parts.push({ type: 'text', value: node.value.slice(cursor, match.index) });
        }
        parts.push({
          type: 'mdxJsxTextElement',
          name: 'mark',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'className',
              value: `mark-v${variantFor(match[1])}`,
            },
          ],
          children: [{ type: 'text', value: match[1] }],
        });
        cursor = match.index + match[0].length;
      }

      if (parts.length === 0) {
        return undefined;
      }
      if (cursor < node.value.length) {
        parts.push({ type: 'text', value: node.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...parts);
      // Skip the nodes we just inserted, or visit() would re-scan them.
      return [SKIP, index + parts.length];
    });
  };
}
