import sanitizeHtml from "sanitize-html";

/**
 * Sanitize HTML content for safe rendering in the browser.
 *
 * WHY: Article content is rendered with `dangerouslySetInnerHTML` in the
 * public article page. Without sanitization, an attacker with admin access
 * (or via another content-injection vector) could inject <script>, event
 * handlers, javascript: URLs, etc. — leading to stored XSS, session theft,
 * and PII exfiltration.
 *
 * Uses `sanitize-html` with a strict allowlist. For most use cases, the
 * defaults below are appropriate; tweak `ALLOWED_TAGS` / `ALLOWED_ATTRS` to
 * match your content editor's output (TipTap, Quill, Lexical all emit
 * similar HTML).
 *
 * Defense in depth: also call this BEFORE persisting content in admin
 * actions (see app/actions/articles.ts).
 */

const ALLOWED_TAGS = [
  // Block-level
  "p", "br", "hr", "div", "blockquote", "pre", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  // Inline
  "a", "b", "i", "em", "strong", "u", "s", "sub", "sup",
  "span", "small", "mark", "code", "kbd", "abbr", "cite",
  "img", "picture", "source",
];

const ALLOWED_ATTRS: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "target", "rel", "class"],
  img: ["src", "alt", "title", "width", "height", "loading", "class"],
  table: ["class"],
  th: ["scope", "colspan", "rowspan"],
  td: ["colspan", "rowspan"],
  "*": ["class", "id"],
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRS,
  // Strip dangerous tags entirely
  disallowedTagsMode: "discard",
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
  allowProtocolRelative: false,
  // Force external links to be safe
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const isExternal = /^https?:\/\//i.test(href);
      return {
        tagName: "a",
        attribs: {
          ...attribs,
          ...(isExternal
            ? { target: "_blank", rel: "noopener noreferrer nofollow" }
            : {}),
        },
      };
    },
  },
};

/**
 * Sanitize an HTML string for safe rendering.
 * Returns empty string if input is null/undefined.
 *
 * Note: sanitize-html already strips event handler attributes
 * (onclick, onerror, onload, etc.) and javascript: URLs by default
 * via `allowedSchemes`. We don't need to do that manually.
 */
export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/**
 * Strip ALL HTML tags, returning plain text.
 * Useful for excerpts, meta descriptions, OG tags where we want no markup.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}
