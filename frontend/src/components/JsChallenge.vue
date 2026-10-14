<template>
  <div class="card shadow-sm mb-4">
    <div class="card-body p-4">
      <template v-if="isApi">
        <h2 class="h4 mb-3">API-консоль</h2>
        <div class="mb-4">
          <ApiConsole :subject="challenge.subject" :examples="challenge.examples || []" @add-test="addTest" />
        </div>
      </template>
      <template v-else>
        <h2 class="h4 mb-3">Тестируемая функция</h2>
        <pre class="border rounded mb-4"><code class="hljs" v-html="subjectHtml"></code></pre>
      </template>

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

      <!-- Every run is saved on the server: the work continues on another computer -->
      <div v-if="auth.isAuthenticated" class="small mt-2" aria-live="polite">
        <span v-if="saveError" class="text-danger"><i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>{{ saveError }}</span>
        <span v-else-if="saved" class="text-body-secondary">
          <i class="bi bi-cloud-check me-1" aria-hidden="true"></i>Сохранено {{ formatTime(saved.at) }}<template v-if="saved.percent !== null"> · выполнено {{ saved.percent }}%</template>
        </span>
        <span v-else class="text-body-secondary"><i class="bi bi-cloud me-1" aria-hidden="true"></i>Код и результат сохраняются при каждом запуске тестов</span>
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
import { computed, onMounted, ref, watch } from 'vue';
import CodeEditor from '@/components/CodeEditor.vue';
import ApiConsole from '@/components/ApiConsole.vue';
import { runChallenge } from '@/utils/testRunner';
import { isChallengePassed } from '@/utils/challengeCore';
import { highlight } from '@/utils/highlight';
import { progressAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';

// Per user: classroom computers are shared, one student must not get another one's draft
const draftKey = (lessonId, userId) => `challenge-draft-${userId ?? 'guest'}-${lessonId}`;
// Before drafts were per user
const legacyDraftKey = (lessonId) => `challenge-draft-${lessonId}`;

// Russian plural: 1 тест, 2 теста, 5 тестов
const plural = (n, one, few, many) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

// Local draft between runs: { code, savedAt } (savedAt in ms)
const loadDraft = (lessonId, userId) => {
  try {
    const stored = localStorage.getItem(draftKey(lessonId, userId));
    if (stored) return JSON.parse(stored);
    const legacy = localStorage.getItem(legacyDraftKey(lessonId));
    return legacy === null ? null : { code: legacy, savedAt: 0 };
  } catch {
    return null;
  }
};

const saveDraft = (lessonId, userId, code) => {
  try {
    localStorage.setItem(draftKey(lessonId, userId), JSON.stringify({ code, savedAt: Date.now() }));
    localStorage.removeItem(legacyDraftKey(lessonId));
  } catch {
    // Drafts are a convenience; ignore storage errors
  }
};

const formatTime = (value) => new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default {
  name: 'JsChallenge',
  components: { CodeEditor, ApiConsole },
  props: {
    lessonId: { type: [Number, String], required: true },
    challenge: { type: Object, required: true }
  },
  emits: ['passed'],
  setup(props, { emit }) {
    const auth = useAuthStore();
    const userId = auth.user?.id;
    const localDraft = loadDraft(props.lessonId, userId);
    const code = ref(localDraft?.code ?? props.challenge.starter ?? '');
    const saved = ref(null);
    const saveError = ref(null);
    const result = ref(null);
    const running = ref(false);
    const minTests = computed(() => props.challenge.minTests || 1);
    const isApi = computed(() => props.challenge.kind === 'api');

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
      if (r.tests.length < minTests.value) {
        return `Нужно минимум ${minTests.value} ${plural(minTests.value, 'тест', 'теста', 'тестов')}, сейчас ${r.tests.length}.`;
      }
      const left = r.mutants.filter((m) => !m.caught).length;
      return `Осталось поймать багов: ${left}. Добавьте тесты на случаи, которые ещё не проверены.`;
    });

    let edited = false;
    watch(code, (value) => {
      edited = true;
      saveDraft(props.lessonId, userId, value);
    });

    // The server keeps the code of the last run: take it when it is newer than the local draft,
    // e.g. the student ran the tests on another computer
    onMounted(async () => {
      if (!auth.isAuthenticated) return;
      try {
        const { data } = await progressAPI.getLesson(props.lessonId);
        if (!data.draft_saved_at) return;
        saved.value = { at: data.draft_saved_at, percent: data.progress_percent };
        const serverNewer = new Date(data.draft_saved_at).getTime() > (localDraft?.savedAt ?? 0);
        if (typeof data.draft?.code === 'string' && serverNewer && !edited) {
          code.value = data.draft.code;
        }
      } catch {
        // The local draft is still there
      }
    });

    const saveRun = async (r) => {
      saveError.value = null;
      try {
        const { data } = await progressAPI.saveRun(props.lessonId, {
          code: code.value,
          result: {
            tests: r.error ? 0 : r.tests.length,
            tests_passed: r.error ? 0 : r.tests.filter((t) => t.passed).length,
            caught: r.error ? props.challenge.mutants.map(() => false) : r.mutants.map((m) => m.caught)
          }
        });
        saved.value = { at: data.draft_saved_at, percent: data.progress_percent };
      } catch (err) {
        saveError.value = err.response?.data?.error || 'Не удалось сохранить результат на сервере. Код остался в этом браузере.';
      }
    };

    const run = async () => {
      if (running.value) return;
      running.value = true;
      result.value = await runChallenge({
        subject: props.challenge.subject,
        mutants: props.challenge.mutants || [],
        code: code.value,
        kind: props.challenge.kind
      });
      running.value = false;
      if (auth.isAuthenticated) await saveRun(result.value);
      if (passed.value) emit('passed');
    };

    const addTest = (snippet) => {
      code.value = `${code.value.replace(/\s+$/, '')}\n\n${snippet}\n`;
    };

    const reset = () => {
      code.value = props.challenge.starter || '';
      result.value = null;
    };

    return {
      auth, saved, saveError, formatTime,
      code, result, running, isApi, subjectHtml, solutionHtml, referencePassed, passed, nextStep, run, reset, addTest
    };
  }
};
</script>
