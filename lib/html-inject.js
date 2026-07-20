// Zero-dep HTML surgery for the grid injector. Operates on strings, not a DOM,
// so it never reformats the untouched parts of a hand-authored page.

// Replace the inner HTML of the i-th element matching `openRe` with `newInners[i]`.
// `tag` is the element's tag name; nested same-tag children are balanced correctly,
// so a grid `<div>` full of card `<div>`s is matched to its true closing tag.
// Throws if fewer than newInners.length containers are found, or a container is unbalanced.
export function replaceEachInner(html, openRe, newInners, tag = 'div') {
  const re = new RegExp(openRe.source, openRe.flags.includes('g') ? openRe.flags : openRe.flags + 'g');
  let out = '';
  let cursor = 0; // chars of `html` already copied into `out`
  let i = 0;
  let m;
  while (i < newInners.length && (m = re.exec(html))) {
    const innerStart = m.index + m[0].length;
    const token = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
    token.lastIndex = innerStart;
    let depth = 1, t, innerEnd = -1;
    while ((t = token.exec(html))) {
      depth += t[1] === '/' ? -1 : 1;
      if (depth === 0) { innerEnd = t.index; break; }
    }
    if (innerEnd === -1) throw new Error(`replaceEachInner: unbalanced <${tag}>`);
    out += html.slice(cursor, innerStart) + newInners[i];
    cursor = innerEnd;
    re.lastIndex = innerEnd;
    i++;
  }
  if (i < newInners.length) {
    throw new Error(`replaceEachInner: expected ${newInners.length} <${tag}> containers, found ${i}`);
  }
  return out + html.slice(cursor);
}

// Single required replace — throws if the pattern is not present, so a missed
// count/label update fails loudly instead of silently going stale.
export function replaceCount(html, re, replacement) {
  if (!re.test(html)) throw new Error(`replaceCount: pattern not found: ${re}`);
  return html.replace(re, replacement);
}
