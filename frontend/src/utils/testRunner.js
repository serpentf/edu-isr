import { evaluateChallenge } from './challengeCore';

const TIMEOUT_MS = 3000;

const WORKER_SOURCE = `const evaluateChallenge = ${evaluateChallenge.toString()};
self.onmessage = (event) => self.postMessage(evaluateChallenge(event.data));`;

const failure = (error) => ({ error, tests: [], logs: [], mutants: [] });

// Runs student code in a Web Worker: no access to the page, and an infinite loop
// is cut off by terminating the worker.
export const runChallenge = ({ subject, mutants, code, kind }) => new Promise((resolve) => {
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
  const worker = new Worker(url);

  const finish = (result) => {
    clearTimeout(timer);
    worker.terminate();
    URL.revokeObjectURL(url);
    resolve(result);
  };

  const timer = setTimeout(() => finish(failure(
    `Тесты выполнялись дольше ${TIMEOUT_MS / 1000} секунд — возможно, в коде бесконечный цикл.`
  )), TIMEOUT_MS);

  worker.onmessage = (event) => finish(event.data);
  worker.onerror = (event) => {
    event.preventDefault();
    finish(failure(event.message));
  };

  // Plain copies: Vue reactive proxies cannot be posted to a worker
  worker.postMessage({
    subject: String(subject),
    mutants: mutants.map(({ hint, source }) => ({ hint, source })),
    code: String(code),
    kind: kind || 'function'
  });
});
