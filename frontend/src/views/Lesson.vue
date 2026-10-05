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
          <span class="badge fs-6" :class="lessonTypeBadgeClass(lesson.type)">{{ lessonTypeLabel(lesson.type) }}</span>
        </div>

        <!-- Lesson Content -->
        <div v-if="lesson.content" class="card shadow-sm mb-4">
          <div class="card-body p-4" v-html="renderedContent"></div>
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
              <legend class="fs-6 fw-bold mb-3">{{ index + 1 }}. {{ question.text }}</legend>
              <div class="form-check mb-2" v-for="(option, optionIndex) in question.options" :key="option">
                <input class="form-check-input" type="radio" :name="`question-${index}`"
                       :value="option" v-model="answers[index]" :id="`option-${index}-${optionIndex}`">
                <label class="form-check-label" :for="`option-${index}-${optionIndex}`">{{ option }}</label>
              </div>
            </fieldset>
            <button @click="submitQuiz" class="btn btn-primary" :disabled="!allAnswersSelected">
              Проверить ответы
            </button>
            <div v-if="quizResult" class="alert mt-3 mb-0" :class="quizResult >= 70 ? 'alert-success' : 'alert-danger'">
              <strong>Результат:</strong> {{ quizResult }}%
            </div>
          </div>
        </div>

        <!-- JavaScript challenge, graded in the browser -->
        <JsChallenge
          v-if="lesson.type === 'code_challenge' && lesson.code_challenge_data?.language === 'javascript'"
          :lesson-id="lesson.id"
          :challenge="lesson.code_challenge_data"
          @passed="onChallengePassed"
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
            <div v-if="codeResult" class="alert mt-3 mb-0" :class="codeResult.includes('✅') ? 'alert-success' : 'alert-danger'">
              {{ codeResult }}
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="text-center mt-4">
          <button @click="markAsComplete" class="btn btn-success btn-lg" :disabled="isCompleted">
            <span v-if="isCompleted">✓ Пройдено</span>
            <span v-else>Отметить как пройденное</span>
          </button>
        </div>
      </div>

      <div v-else class="alert alert-warning">Урок не найден.</div>
    </div>
  </div>
</template>

<script>
import { onMounted, computed, ref, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';
import { renderMarkdown } from '@/utils/markdown';
import { lessonTypeBadgeClass, lessonTypeLabel } from '@/utils/badges';
import { coursesAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';

export default {
  name: 'Lesson',
  components: {
    // Loaded only on challenge lessons: the code editor is the heaviest dependency
    JsChallenge: defineAsyncComponent(() => import('@/components/JsChallenge.vue'))
  },
  setup() {
    const route = useRoute();
    const auth = useAuthStore();
    const progressStore = useProgressStore();

    const lesson = ref(null);
    const loading = ref(true);
    const isCompleted = ref(false);
    const answers = ref({});
    const quizResult = ref(null);
    const code = ref('');
    const codeResult = ref(null);

    const renderedContent = computed(() => {
      if (!lesson.value?.content) return '';
      return renderMarkdown(lesson.value.content);
    });

    const allAnswersSelected = computed(() => {
      if (!lesson.value?.quiz_data?.questions) return false;
      return lesson.value.quiz_data.questions.every((_, i) => answers.value[i] !== undefined);
    });

    const loadLesson = async () => {
      try {
        const { data } = await coursesAPI.getLesson(route.params.id);
        lesson.value = data;
      } catch (error) {
        console.error('Failed to load lesson:', error);
      } finally {
        loading.value = false;
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

    const submitQuiz = () => {
      if (!lesson.value?.quiz_data?.questions) return;
      let correct = 0;
      lesson.value.quiz_data.questions.forEach((question, index) => {
        if (answers.value[index] === question.correct) correct++;
      });
      const score = (correct / lesson.value.quiz_data.questions.length * 100).toFixed(0);
      quizResult.value = score;
      progressStore.updateLessonProgress(lesson.value.id, {
        is_completed: parseInt(score) >= 70,
        quiz_score: parseInt(score)
      });
    };

    const submitCode = async () => {
      try {
        codeResult.value = '✅ Код принят на проверку! (Демонстрация)';
        await progressStore.updateLessonProgress(lesson.value.id, {
          is_completed: true,
          code_submission: code.value
        });
      } catch (error) {
        codeResult.value = '❌ Ошибка при проверке кода';
      }
    };

    const onChallengePassed = async (submission) => {
      isCompleted.value = true;
      if (!auth.isAuthenticated) return;
      try {
        await progressStore.updateLessonProgress(lesson.value.id, {
          is_completed: true,
          code_submission: submission
        });
      } catch (error) {
        console.error('Failed to save challenge result:', error);
      }
    };

    onMounted(() => { loadLesson(); });

    return {
      lesson, loading, isCompleted, renderedContent, lessonTypeLabel,
      markAsComplete, answers, allAnswersSelected, quizResult, submitQuiz,
      code, codeResult, submitCode, auth, lessonTypeBadgeClass, onChallengePassed
    };
  }
};
</script>

