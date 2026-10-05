// Grading core for JavaScript challenges: runs student tests against the reference
// implementation and against mutants (implementations with planted bugs).
// evaluateChallenge must stay self-contained: it is serialized into a Web Worker via
// toString() and also imported by scripts/build-course-seed.js to verify solutions.

export function evaluateChallenge({ subject, mutants = [], code }) {
  class AssertionError extends Error {}

  const format = (value) => {
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'function') return 'функция';
    if (value === undefined) return 'undefined';
    if (Number.isNaN(value)) return 'NaN';
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const deepEqual = (a, b) => {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    return keysA.length === keysB.length && keysA.every((key) => deepEqual(a[key], b[key]));
  };

  const expect = (actual) => {
    const matchers = (negated) => {
      const check = (pass, message, negatedMessage) => {
        if (pass === negated) throw new AssertionError(negated ? negatedMessage : message);
      };

      return {
        toBe: (expected) => check(Object.is(actual, expected),
          `Ожидалось ${format(expected)}, получено ${format(actual)}`,
          `Ожидалось значение, отличное от ${format(expected)}`),
        toEqual: (expected) => check(deepEqual(actual, expected),
          `Ожидалось ${format(expected)}, получено ${format(actual)}`,
          `Ожидалось значение, отличное от ${format(expected)}`),
        toBeCloseTo: (expected, digits = 2) => check(Math.abs(actual - expected) < 10 ** -digits / 2,
          `Ожидалось ≈ ${format(expected)}, получено ${format(actual)}`,
          `Ожидалось значение, не близкое к ${format(expected)}`),
        toBeTruthy: () => check(Boolean(actual),
          `Ожидалось истинное значение, получено ${format(actual)}`,
          `Ожидалось ложное значение, получено ${format(actual)}`),
        toBeFalsy: () => check(!actual,
          `Ожидалось ложное значение, получено ${format(actual)}`,
          `Ожидалось истинное значение, получено ${format(actual)}`),
        toBeGreaterThan: (expected) => check(actual > expected,
          `Ожидалось больше ${format(expected)}, получено ${format(actual)}`,
          `Ожидалось не больше ${format(expected)}, получено ${format(actual)}`),
        toBeLessThan: (expected) => check(actual < expected,
          `Ожидалось меньше ${format(expected)}, получено ${format(actual)}`,
          `Ожидалось не меньше ${format(expected)}, получено ${format(actual)}`),
        toThrow: (expected) => {
          if (typeof actual !== 'function') {
            throw new AssertionError('Для toThrow передайте в expect функцию: expect(() => f(x)).toThrow()');
          }
          let thrown = null;
          let result;
          try {
            result = actual();
          } catch (error) {
            thrown = error;
          }
          if (!thrown) {
            check(false, `Ожидалось исключение, но функция вернула ${format(result)}`, '');
            return;
          }
          const message = String(thrown?.message ?? thrown);
          const matches = expected === undefined || message.includes(expected);
          check(matches,
            `Ожидалось исключение с текстом ${format(expected)}, получено ${format(message)}`,
            `Ожидалось, что исключения не будет, но выброшено: ${format(message)}`);
        }
      };
    };

    return { ...matchers(false), not: matchers(true) };
  };

  const run = (implementation, logs) => {
    const tests = [];
    const test = (name, fn) => tests.push({ name: String(name), fn });
    const sandboxConsole = {
      log: (...args) => logs?.push(args.map((arg) => (typeof arg === 'string' ? arg : format(arg))).join(' '))
    };

    try {
      // eslint-disable-next-line no-new-func
      new Function('test', 'it', 'expect', 'console', `${implementation}\n;\n${code}`)(
        test, test, expect, sandboxConsole
      );
    } catch (error) {
      return { error: `${error.name}: ${error.message}`, tests: [] };
    }

    return {
      error: null,
      tests: tests.map(({ name, fn }) => {
        try {
          fn();
          return { name, passed: true };
        } catch (error) {
          const message = error instanceof AssertionError ? error.message : `${error.name}: ${error.message}`;
          return { name, passed: false, error: message };
        }
      })
    };
  };

  const logs = [];
  const reference = run(subject, logs);
  const mutantResults = mutants.map((mutant) => {
    const result = run(mutant.source, null);
    return { hint: mutant.hint, caught: Boolean(result.error) || result.tests.some((t) => !t.passed) };
  });

  return { error: reference.error, tests: reference.tests, logs, mutants: mutantResults };
}

export const isChallengePassed = (result, minTests = 1) =>
  !result.error &&
  result.tests.length >= minTests &&
  result.tests.every((t) => t.passed) &&
  result.mutants.every((m) => m.caught);
