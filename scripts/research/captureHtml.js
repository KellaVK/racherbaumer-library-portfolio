import { JSDOM } from 'jsdom';
import { validateCapture } from './extraction.js';
/** Parse an already obtained page. Never fetch URLs or execute page scripts. */
export function captureHtml(html, metadata) {
  if (typeof html !== 'string' || Buffer.byteLength(html) > 5_000_000) throw new Error('HTML must be under 5 MB');
  if (!metadata.selector) throw new Error('Choose the product-description section explicitly');
  const dom = new JSDOM(html);
  try {
    const sections = dom.window.document.querySelectorAll(metadata.selector);
    if (sections.length !== 1) throw new Error('Product selector must identify exactly one section');
    const section = sections[0].cloneNode(true);
    section.querySelectorAll('script,style,nav,form,button,iframe').forEach(node=>node.remove());
    // Preserve list boundaries for later review/extraction; do not flatten titles together.
    section.querySelectorAll('br').forEach(node=>node.replaceWith('\n'));
    section.querySelectorAll('p,li,h1,h2,h3,h4,div,section').forEach(node=>node.append('\n'));
    const text = section.textContent.split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
    return validateCapture({ dvdId:metadata.dvdId,url:metadata.url,pageTitle:metadata.pageTitle,
      creator:metadata.creator,format:metadata.format,access:'manual_capture',text,
      capturedAt:new Date().toISOString(),selector:metadata.selector });
  } finally { dom.window.close(); }
}
