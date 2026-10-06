<template>
  <div class="card shadow-sm mb-4">
    <div class="card-body p-4">
      <h2 class="h4 mb-3">Тестируемая функция</h2>
      <pre class="border rounded mb-4"><code class="hljs" v-html="subjectHtml"></code></pre>

      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h2 class="h4 mb-0">Ваши тесты</h2>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="reset"><i class="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>Сбросить к началу</button>
      </div>
      <CodeEditor v-model="code" label="Код тестов" @run="run" />

      <div class="d-flex flex-wrap align-items-center gap-3 mt-3">
        <button type="button" class="btn btn-primary" :disabled="running" @click="run">
          <span v-if="running" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          <i v-else class="bi bi-play-fill me-1" aria-hidden="true"></i>Запустить тесты
        </button>
        <span class="small text-body-secondary">или Ctrl+Enter (⌘+Enter)</span>
      </div>

      <div v-if="result" class="mt-4" aria-live="polite">
        <div v-if="result.error" class="alert alert-danger">
          <strong>Код не выполнился.</strong> {{ result.error }}
        </div>

        <template v-else>
          <!-- Reference implementation -->
          <h3 class="h6 text-uppercase text-body-secondary">Тесты на правильной реализации</h3>
          <div v-if="result.tests.length" class="list-group mb-3">
            <div v-for="(test, index) in result.tests" :key="index"
                 class="list-group-item" :class="test.passed ? 'list-group-item-success' : 'list-group-item-danger'">
              <div><i class="bi me-2" :class="test.passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'" aria-hidden="true"></i><span class="visually-hidden">{{ test.passed ? 'Прошёл:' : 'Упал:' }}</span>{{ test.name }}</div>
              <div v-if="!test.passed" class="small font-monospace">{{ test.error }}</div>
            </div>
          </div>
          <div v-else class="alert alert-warning">Не найдено ни одного теста. Объявите тест через <code>test('название', () =&gt; {...})</code>.</div>

          <!-- Mutants -->
          <h3 class="h6 text-uppercase text-body-secondary">Баги, которые должны поймать тесты</h3>
          <p v-if="!referencePassed" class="small text-body-secondary">
            Сначала добейтесь, чтобы все тесты проходили на правильной реализации: тест, который падает на верном коде, ничего не говорит о багах.
          </p>
          <div class="list-group mb-3">
            <div v-for="(mutant, index) in result.mutants" :key="index"
                 class="list-group-item d-flex gap-2"
                 :class="{ 'list-group-item-success': referencePassed && mutant.caught }">
              <i class="bi" :class="referencePassed && mutant.caught ? 'bi-check-circle-fill' : 'bi-bug'" aria-hidden="true"></i>
              <span class="visually-hidden">{{ referencePassed && mutant.caught ? 'Пойман:' : 'Не пойман:' }}</span>
              <span>{{ mutant.hint }}</span>
            </div>
          </div>

          <div v-if="result.logs.length" class="mb-3">
            <h3 class="h6 text-uppercase text-body-secondary">Вывод console.log</h3>
            <pre class="border rounded bg-body-tertiary p-3 small mb-0">{{ result.logs.join('\n') }}</pre>
          </div>

          <div v-if="passed" class="alert alert-success mb-0">
            <i class="bi bi-trophy-fill me-1" aria-hidden="true"></i><strong>Задание выполнено!</strong> Ваши тесты проходят на правильном коде и ловят все баги.
          </div>
          <div v-else class="alert alert-info mb-0">{{ nextStep }}</div>
        </template>
      </div>

      <details v-if="passed && challenge.solution" class="border rounded p-3 mt-3">
        <summary class="fw-semibold">Эталонное решение</summary>
        <pre class="border rounded mt-3 mb-0"><code class="hljs" v-html="solutionHtml"></code></pre>
      </details>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue';
import CodeEditor from '@/components/CodeEditor.vue';
import { runChallenge } from '@/utils/testRunner';
import { isChallengePassed } from '@/utils/challengeCore';
import { highlight } from '@/utils/highlight';

const draftKey = (lessonId) => `challenge-draft-${lessonId}`;

const loadDraft = (lessonId) => {
  try {
    return localStorage.getItem(draftKey(lessonId));
  } catch {
    return null;
  }
};

const saveDraft = (lessonId, code) => {
  try {
    localStorage.setItem(draftKey(lessonId), code);
  } catch {
    // Drafts are a convenience; ignore storage errors
  }
};

export default {
  name: 'JsChallenge',
  components: { CodeEditor },
  props: {
    lessonId: { type: [Number, String], required: true },
    challenge: { type: Object, required: true }
  },
  emits: ['passed'],
  setup(props, { emit }) {
    const code = ref(loadDraft(props.lessonId) ?? props.challenge.starter ?? '');
    const result = ref(null);
    const running = ref(false);
    const minTests = computed(() => props.challenge.minTests || 1);

    const subjectHtml = computed(() => highlight(props.challenge.subject, 'javascript'));
    const solutionHtml = computed(() => highlight(props.challenge.solution || '', 'javascript'));

    const referencePassed = computed(() =>
      result.value && !result.value.error && result.value.tests.length > 0 && result.value.tests.every((t) => t.passed)
    );
    const passed = computed(() => result.value && isChallengePassed(result.value, minTests.value));

    const nextStep = computed(() => {
      const r = result.value;
      if (!r.tests.length) return 'Напишите хотя бы один тест.';
      if (!referencePassed.value) return 'Исправьте тесты, которые падают на правильной реализации.';
      if (r.tests.length < minTests.value) return `Нужно минимум ${minTests.value} теста(ов), сейчас ${r.tests.length}.`;
      const left = r.mutants.filter((m) => !m.caught).length;
      return `Осталось поймать багов: ${left}. Добавьте тесты на случаи, которые ещё не проверены.`;
    });

    watch(code, (value) => saveDraft(props.lessonId, value));

    const run = async () => {
      if (running.value) return;
      running.value = true;
      result.value = await runChallenge({
        subject: props.challenge.subject,
        mutants: props.challenge.mutants || [],
        code: code.value
      });
      running.value = false;
      if (passed.value) emit('passed', code.value);
    };

    const reset = () => {
      code.value = props.challenge.starter || '';
      result.value = null;
    };

    return { code, result, running, subjectHtml, solutionHtml, referencePassed, passed, nextStep, run, reset };
  }
};
</script>
