import { marked } from 'marked';
import { highlightBlocks } from './highlight';

// Bootstrap classes for elements produced by Markdown, so lesson content needs no custom CSS
const CLASSES = {
  h2: 'mt-5 mb-3',
  h3: 'mt-4 mb-2',
  table: 'table table-bordered table-sm align-middle',
  thead: 'table-light',
  img: 'img-fluid rounded border',
  blockquote: 'border-start border-4 border-primary-subtle bg-body-tertiary px-3 py-2 rounded-end',
  pre: 'border rounded',
  details: 'border rounded p-3 mb-3',
  summary: 'fw-semibold'
};

export const renderMarkdown = (source) => {
  const doc = new DOMParser().parseFromString(marked.parse(source || ''), 'text/html');

  for (const [selector, classes] of Object.entries(CLASSES)) {
    doc.body.querySelectorAll(selector).forEach((el) => el.classList.add(...classes.split(' ')));
  }

  // Wide tables scroll horizontally instead of breaking the layout on phones
  doc.body.querySelectorAll('table').forEach((table) => {
    const wrapper = doc.createElement('div');
    wrapper.className = 'table-responsive mb-3';
    table.replaceWith(wrapper);
    wrapper.appendChild(table);
  });

  highlightBlocks(doc.body);

  doc.body.querySelectorAll('blockquote > :last-child').forEach((el) => el.classList.add('mb-0'));

  return doc.body.innerHTML;
};
