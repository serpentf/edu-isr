import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import gherkin from 'highlight.js/lib/languages/gherkin';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import 'highlight.js/styles/github.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('gherkin', gherkin);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('plaintext', plaintext);

// Returns highlighted HTML; unknown languages fall back to escaped plain text
export const highlight = (code, language) => {
  const lang = hljs.getLanguage(language) ? language : 'plaintext';
  return hljs.highlight(code, { language: lang }).value;
};

// Highlights every <pre><code> block inside a DOM node (marked sets class="language-xxx")
export const highlightBlocks = (root) => {
  root.querySelectorAll('pre > code').forEach((el) => {
    const language = [...el.classList].find((c) => c.startsWith('language-'))?.slice('language-'.length);
    el.innerHTML = highlight(el.textContent, language || 'plaintext');
    el.classList.add('hljs');
  });
};
