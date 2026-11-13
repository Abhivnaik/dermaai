// Heading anchor ids. Must match slugify() in rag/library.py, which the
// backend uses for the `anchor` of each cited passage.
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
