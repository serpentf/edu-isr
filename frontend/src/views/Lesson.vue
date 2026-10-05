<template>
  <div class="lesson-page">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
      <p class="mt-3 text-muted">Загрузка урока...</p>
    </div>

    <div v-else-if="lesson" class="lesson-container">
      <!-- Lesson Header -->
      <div class="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <router-link to="/courses" class="text-decoration-none">&larr; Все курсы</router-link>
          <h1 class="h2 mt-2 mb-0">{{ lesson.title }}</h1>
        </div>
        <span class="badge fs-6 mt-2 mt-md-0" :class="lessonTypeBadgeClass(lesson.type)">{{ getLessonTypeLabel(lesson.type) }}</span>
      </div>

      <!-- Lesson Content -->
      <div class="lesson-content card mb-4" v-html="renderedContent"></div>

      <!-- Video -->
      <div v-if="lesson.type === 'video' && lesson.video_url" class="card mb-4">
        <div class="card-body p-0">
          <video controls class="w-100" style="max-height: 500px;">
            <source :src="lesson.video_url" />
            Ваш браузер не поддерживает видео.
          </video>
        </div>
      </div>

      <!-- Quiz -->
      <div v-if="lesson.type === 'quiz' && lesson.quiz_data" class="card mb-4 bg-light">
        <div class="card-body">
          <h2 class="h4 mb-4">Тест</h2>
          <div class="quiz-questions">
            <div v-for="(question, index) in lesson.quiz_data.questions" :key="index" class="mb-4 pb-4 border-bottom">
              <p class="fw-bold mb-3">{{ index + 1 }}. {{ question.text }}</p>
              <div class="options">
                <div class="form-check mb-2" v-for="option in question.options" :key="option">
                  <input class="form-check-input" type="radio" :name="`question-${index}`" 
                         :value="option" v-model="answers[index]" id="option-{{ index }}-{{ option }}">
                  <label class="form-check-label" :for="`option-${index}-${option}`">
                    {{ option }}
                  </label>
                </div>
              </div>
            </div>
          </div>
          <button @click="submitQuiz" class="btn btn-primary" :disabled="!allAnswersSelected">
            Проверить ответы
          </button>
          <div v-if="quizResult" class="alert mt-3" :class="quizResult >= 70 ? 'alert-success' : 'alert-danger'">
            <strong>Результат:</strong> {{ quizResult }}%
          </div>
        </div>
      </div>

      <!-- Code Challenge -->
      <div v-if="lesson.type === 'code_challenge' && lesson.code_challenge_data" class="card mb-4 bg-light">
        <div class="card-body">
          <h2 class="h4 mb-4">Практическое задание</h2>
          <div class="mb-3" v-html="lesson.code_challenge_data.task"></div>
          <div class="mb-3">
            <textarea v-model="code" placeholder="Введите ваш код здесь..." 
                      class="form-control font-monospace" rows="8"></textarea>
          </div>
          <button @click="submitCode" class="btn btn-primary" :disabled="!code.trim()">
            Проверить код
          </button>
          <div v-if="codeResult" class="alert mt-3" :class="codeResult.includes('✅') ? 'alert-success' : 'alert-danger'">
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
  </div>
</template>

<script>
import { onMounted, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';

export default {
  name: 'Lesson',
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
      return marked(lesson.value.content);
    });

    const allAnswersSelected = computed(() => {
      if (!lesson.value?.quiz_data?.questions) return false;
      return lesson.value.quiz_data.questions.every((_, i) => answers.value[i] !== undefined);
    });

    const getLessonTypeLabel = (type) => {
      const labels = {
        text: '📄 Текст',
        video: '🎥 Видео',
        quiz: '❓ Тест',
        code_challenge: '💻 Практика'
      };
      return labels[type] || type;
    };

    const lessonTypeBadgeClass = (type) => {
      const classes = {
        text: 'bg-info',
        video: 'bg-danger',
        quiz: 'bg-warning text-dark',
        code_challenge: 'bg-success'
      };
      return classes[type] || 'bg-secondary';
    };

    const loadLesson = async () => {
      try {
        const response = await fetch(`/api/courses/${route.params.id}`);
        const data = await response.json();
        for (const module of data.modules) {
          const found = module.lessons.find(l => l.id === parseInt(route.params.id));
          if (found) {
            lesson.value = found;
            break;
          }
        }
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

    onMounted(() => { loadLesson(); });

    return {
      lesson, loading, isCompleted, renderedContent, getLessonTypeLabel,
      markAsComplete, answers, allAnswersSelected, quizResult, submitQuiz,
      code, codeResult, submitCode, auth, lessonTypeBadgeClass
    };
  }
};
</script>

<style scoped>
.lesson-content :deep(h2) {
  color: #16213e;
  margin-top: 2rem;
}

.lesson-content :deep(h3) {
  color: #16213e;
  margin-top: 1.5rem;
}

.lesson-content :deep(code) {
  background: #f4f4f4;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: monospace;
}

.lesson-content :deep(pre) {
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 1.5rem;
  border-radius: 8px;
  overflow-x: auto;
}

.lesson-content :deep(p) {
  line-height: 1.8;
}

.lesson-content :deep(ul), .lesson-content :deep(ol) {
  padding-left: 1.5rem;
}

.lesson-content :deep(li) {
  margin-bottom: 0.5rem;
}
</style>
