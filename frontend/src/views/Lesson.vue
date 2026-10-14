<template>
  <div class="row justify-content-center">
    <div class="col-lg-10 col-xl-9">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
        <p class="mt-3 text-body-secondary">Загрузка урока...</p>
      </div>

      <div v-else-if="lesson">
        <!-- Lesson Header -->
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link to="/courses">Курсы</router-link></li>
            <li v-if="lesson.module?.course" class="breadcrumb-item">
              <router-link :to="`/course/${lesson.module.course.slug}`">{{ lesson.module.course.title }}</router-link>
            </li>
            <li v-if="lesson.module" class="breadcrumb-item active" aria-current="page">{{ lesson.module.title }}</li>
          </ol>
        </nav>
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
          <h1 class="h2 mb-0">{{ lesson.title }}</h1>
          <span class="badge fs-6" :class="lessonTypeBadgeClass(lesson.type)"><i class="bi me-1" :class="lessonTypeIcon(lesson.type)" aria-hidden="true"></i>{{ lessonTypeLabel(lesson.type) }}</span>
        </div>

        <!-- Lesson Content -->
        <div v-if="lesson.content" class="card shadow-sm mb-4">
          <div class="card-body p-4" v-html="renderedContent" @click="followInternalLink"></div>
        </div>

        <!-- Practice checklist: the steps of work done outside the platform -->
        <div v-if="lesson.checklist?.length" class="card shadow-sm mb-4">
          <div class="card-body p-4">
            <fieldset>
              <legend class="h4 mb-1">Чек-лист</legend>
              <p class="text-body-secondary small">Отмечайте шаги по мере выполнения. Когда отмечены все, практика засчитывается.</p>
              <div v-for="(item, index) in lesson.checklist" :key="item" class="form-check mb-2">
                <input :id="`checklist-${index}`" v-model="checkedItems" class="form-check-input" type="checkbox" :value="item"
                       :disabled="!auth.isAuthenticated || checklistSaving" @change="saveChecklist">
                <label class="form-check-label" :for="`checklist-${index}`">{{ item }}</label>
              </div>
            </fieldset>
            <div v-if="auth.isAuthenticated" class="progress mt-3" role="progressbar" aria-label="Выполнено"
                 :aria-valuenow="checklistPercent" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-bar" :class="{ 'bg-success': checklistPercent === 100 }" :style="{ width: checklistPercent + '%' }">{{ checklistPercent }}%</div>
            </div>
            <div v-else class="alert alert-info mt-3 mb-0">
              <router-link :to="`/login?redirect=${encodeURIComponent($route.fullPath)}`">Войдите</router-link>, чтобы отмечать шаги и сохранять прогресс.
            </div>
            <div v-if="checklistError" class="alert alert-danger mt-3 mb-0">{{ checklistError }}</div>
          </div>
        </div>

        <!-- Video -->
        <div v-if="lesson.type === 'video' && lesson.video_url" class="ratio ratio-16x9 mb-4">
          <video controls>
            <source :src="lesson.video_url" />
            Ваш браузер не поддерживает видео.
          </video>
        </div>

        <!-- Quiz -->
        <div v-if="lesson.type === 'quiz' && lesson.quiz_data" class="card shadow-sm mb-4">
          <div class="card-body p-4">
            <h2 class="h4 mb-4">Тест</h2>
            <fieldset v-for="(question, index) in lesson.quiz_data.questions" :key="index" class="mb-4 pb-4 border-bottom">
              <legend class="fs-6 fw-bold mb-3">
                {{ index + 1 }}. {{ question.text }}
                <span v-if="quizResult" class="badge ms-1" :class="quizResult.results[index].correct ? 'text-bg-success' : 'text-bg-danger'">
                  <i class="bi me-1" :class="quizResult.results[index].correct ? 'bi-check-lg' : 'bi-x-lg'" aria-hidden="true"></i>{{ quizResult.results[index].correct ? 'Верно' : 'Неверно' }}
                </span>
              </legend>
              <div class="form-check mb-2" v-for="(option, optionIndex) in question.options" :key="option">
                <input class="form-check-input" type="radio" :name="`question-${index}`"
                       :value="option" v-model="answers[index]" :id="`option-${index}-${optionIndex}`" @change="quizResult = null">
                <label class="form-check-label" :for="`option-${index}-${optionIndex}`">{{ option }}</label>
              </div>
            </fieldset>

            <div v-if="!auth.isAuthenticated" class="alert alert-info mb-0">
              Тесты проверяются на сервере и засчитываются в сертификат.
              <router-link :to="`/login?redirect=${encodeURIComponent($route.fullPath)}`">Войдите</router-link>, чтобы пройти тест.
            </div>
            <template v-else>
              <button @click="submitQuiz" class="btn btn-primary" :disabled="!allAnswersSelected || quizSubmitting">
                <span v-if="quizSubmitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                Проверить ответы
              </button>
              <div v-if="quizError" class="alert alert-danger mt-3 mb-0">{{ quizError }}</div>
              <div v-if="quizResult" class="alert mt-3 mb-0" :class="quizResult.passed ? 'alert-success' : 'alert-warning'" aria-live="polite">
                <strong>Результат: {{ quizResult.score }}%.</strong>
                <span v-if="quizResult.passed"> Тест сдан.</span>
                <span v-else> Для зачёта нужно {{ quizResult.pass_score }}%. Исправьте ответы, отмеченные «Неверно», и отправьте снова.</span>
                <span v-if="quizResult.best_score > quizResult.score"> Лучший результат: {{ quizResult.best_score }}%.</span>
              </div>
            </template>
          </div>
        </div>

        <!-- JavaScript challenge, graded in the browser -->
        <JsChallenge
          :key="lesson.id"
          v-if="lesson.type === 'code_challenge' && lesson.code_challenge_data?.language === 'javascript'"
          :lesson-id="lesson.id"
          :challenge="lesson.code_challenge_data"
          @passed="onChallengePassed"
        />

        <!-- DevTools lab, graded on the server -->
        <DevtoolsLab
          :key="lesson.id"
          v-else-if="lesson.type === 'code_challenge' && lesson.code_challenge_data?.language === 'devtools-lab'"
          :lesson-id="lesson.id"
          @passed="isCompleted = true"
        />

        <!-- Code Challenge without automatic grading -->
        <div v-else-if="lesson.type === 'code_challenge' && lesson.code_challenge_data" class="card shadow-sm mb-4">
          <div class="card-body p-4">
            <h2 class="h4 mb-3">Ваше решение</h2>
            <div class="mb-3" v-html="lesson.code_challenge_data.task"></div>
            <div class="mb-3">
              <label for="code" class="visually-hidden">Код решения</label>
              <textarea id="code" v-model="code" placeholder="Введите ваш код здесь..."
                        class="form-control font-monospace" rows="10"></textarea>
            </div>
            <button @click="submitCode" class="btn btn-primary" :disabled="!code.trim()">
              Отправить решение
            </button>
            <div v-if="codeResult" class="alert mt-3 mb-0" :class="codeResult.ok ? 'alert-success' : 'alert-danger'">
              <i class="bi me-1" :class="codeResult.ok ? 'bi-check-circle-fill' : 'bi-x-circle-fill'" aria-hidden="true"></i>{{ codeResult.text }}
            </div>
          </div>
        </div>

        <!-- Actions: quizzes and auto-graded practice are completed only by their result -->
        <div class="text-center mt-4">
          <button v-if="!gradedByResult" @click="markAsComplete" class="btn btn-success btn-lg" :disabled="isCompleted">
            <span v-if="isCompleted"><i class="bi bi-check-lg me-1" aria-hidden="true"></i>Пройдено</span>
            <span v-else>Отметить как пройденное</span>
          </button>
          <span v-else-if="isCompleted" class="badge text-bg-success fs-6">
            <i class="bi bi-check-lg me-1" aria-hidden="true"></i>Пройдено
          </span>
        </div>
      </div>

      <div v-else class="alert alert-warning">Урок не найден.</div>
    </div>
  </div>
</template>

<script>
import { onMounted, computed, ref, watch, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { renderMarkdown } from '@/utils/markdown';
import { lessonTypeBadgeClass, lessonTypeLabel, lessonTypeIcon } from '@/utils/badges';
import { coursesAPI, progressAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';

export default {
  name: 'Lesson',
  components: {
    // Loaded only on challenge lessons: the code editor is the heaviest dependency
    JsChallenge: defineAsyncComponent(() => import('@/components/JsChallenge.vue')),
    DevtoolsLab: defineAsyncComponent(() => import('@/components/DevtoolsLab.vue'))
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const progressStore = useProgressStore();

    const lesson = ref(null);
    const loading = ref(true);
    const isCompleted = ref(false);
    const answers = ref({});
    const quizResult = ref(null);
    const quizSubmitting = ref(false);
    const quizError = ref(null);
    const code = ref('');
    const codeResult = ref(null);
    const checkedItems = ref([]);
    const checklistSaving = ref(false);
    const checklistError = ref(null);

    const checklistPercent = computed(() => {
      const items = lesson.value?.checklist || [];
      if (!items.length) return 0;
      return Math.round((items.filter((item) => checkedItems.value.includes(item)).length / items.length) * 100);
    });

    const renderedContent = computed(() => {
      if (!lesson.value?.content) return '';
      return renderMarkdown(lesson.value.content);
    });

    const gradedByResult = computed(() =>
      lesson.value?.type === 'quiz' ||
      Boolean(lesson.value?.checklist?.length) ||
      (lesson.value?.type === 'code_challenge' &&
        ['javascript', 'devtools-lab'].includes(lesson.value?.code_challenge_data?.language))
    );

    const allAnswersSelected = computed(() => {
      if (!lesson.value?.quiz_data?.questions) return false;
      return lesson.value.quiz_data.questions.every((_, i) => answers.value[i] !== undefined);
    });

    const loadLesson = async () => {
      try {
        const { data } = await coursesAPI.getLesson(route.params.id);
        lesson.value = data;
        await Promise.all([loadCompletion(), loadChecklist()]);
      } catch (error) {
        console.error('Failed to load lesson:', error);
      } finally {
        loading.value = false;
      }
    };

    // Whether this lesson is already completed, from the course progress on the server
    const loadCompletion = async () => {
      const courseId = lesson.value?.module?.course?.id;
      if (!auth.isAuthenticated || !courseId) return;
      try {
        const { data } = await progressAPI.getCourse(courseId);
        isCompleted.value = data.completed_lesson_ids.includes(lesson.value.id);
      } catch {
        // Progress is a hint here; the lesson itself is already shown
      }
    };

    const loadChecklist = async () => {
      if (!auth.isAuthenticated || !lesson.value?.checklist?.length) return;
      try {
        const { data } = await progressAPI.getLesson(lesson.value.id);
        checkedItems.value = data.draft?.checked || [];
      } catch {
        // The checklist starts empty; ticking saves it again
      }
    };

    const saveChecklist = async () => {
      checklistSaving.value = true;
      checklistError.value = null;
      try {
        const { data } = await progressAPI.saveChecklist(lesson.value.id, checkedItems.value);
        if (data.is_completed) isCompleted.value = true;
      } catch (error) {
        checklistError.value = error.response?.data?.error || 'Не удалось сохранить отметку';
      } finally {
        checklistSaving.value = false;
      }
    };

    const markAsComplete = async () => {
      if (!auth.isAuthenticated) {
        alert('Пожалуйста, войдите для сохранения прогресса');
        return;
      }
      try {
        await progressStore.updateLessonProgress(lesson.value.id, { is_completed: true });
        isCompleted.value = true;
      } catch (error) {
        console.error('Failed to update progress:', error);
      }
    };

    // The server grades the quiz: correct answers are never sent to the browser
    const submitQuiz = async () => {
      const questions = lesson.value?.quiz_data?.questions || [];
      quizSubmitting.value = true;
      quizError.value = null;
      try {
        const { data } = await progressAPI.submitQuiz(lesson.value.id, questions.map((_, i) => answers.value[i]));
        quizResult.value = data;
        if (data.passed) isCompleted.value = true;
      } catch (error) {
        quizError.value = error.response?.data?.error || 'Не удалось проверить тест';
      } finally {
        quizSubmitting.value = false;
      }
    };

    const submitCode = async () => {
      try {
        codeResult.value = { ok: true, text: 'Код принят на проверку! (Демонстрация)' };
        await progressStore.updateLessonProgress(lesson.value.id, {
          is_completed: true,
          code_submission: code.value
        });
      } catch (error) {
        codeResult.value = { ok: false, text: 'Ошибка при проверке кода' };
      }
    };

    // The challenge saves every run itself, the passed one included
    const onChallengePassed = () => {
      isCompleted.value = true;
    };

    // Links to other lessons inside the Markdown content: navigate within the app
    // instead of reloading the page
    const followInternalLink = (event) => {
      const link = event.target.closest('a');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || link.target === '_blank') return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      router.push(url.pathname + url.search + url.hash);
    };

    // The same page instance is reused when moving from one lesson to another
    watch(() => route.params.id, (id, previous) => {
      if (!id || id === previous) return;
      lesson.value = null;
      loading.value = true;
      isCompleted.value = false;
      answers.value = {};
      quizResult.value = null;
      quizError.value = null;
      code.value = '';
      codeResult.value = null;
      checkedItems.value = [];
      checklistError.value = null;
      loadLesson();
    });

    onMounted(() => { loadLesson(); });

    return {
      lesson, loading, isCompleted, renderedContent, lessonTypeLabel,
      markAsComplete, answers, allAnswersSelected, quizResult, quizSubmitting, quizError, submitQuiz, gradedByResult,
      code, codeResult, submitCode, auth, checkedItems, checklistSaving, checklistError, checklistPercent, saveChecklist, lessonTypeBadgeClass, lessonTypeIcon, onChallengePassed, followInternalLink
    };
  }
};
</script>

