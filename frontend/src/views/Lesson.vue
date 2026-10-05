<template>
  <div class="lesson-page">
    <div v-if="loading" class="loading">Загрузка урока...</div>

    <div v-else-if="lesson" class="lesson-container">
      <div class="lesson-header">
        <router-link to="/courses" class="back-link">← Все курсы</router-link>
        <h1>{{ lesson.title }}</h1>
        <span class="lesson-type-badge" :class="lesson.type">{{ getLessonTypeLabel(lesson.type) }}</span>
      </div>

      <div class="lesson-content" v-html="renderedContent"></div>

      <div v-if="lesson.type === 'video' && lesson.video_url" class="video-container">
        <video controls class="video-player">
          <source :src="lesson.video_url" />
          Ваш браузер не поддерживает видео.
        </video>
      </div>

      <div v-if="lesson.type === 'quiz' && lesson.quiz_data" class="quiz-section">
        <h2>Тест</h2>
        <div class="quiz-questions">
          <div v-for="(question, index) in lesson.quiz_data.questions" :key="index" class="question">
            <p><strong>{{ index + 1 }}. {{ question.text }}</strong></p>
            <div class="options">
              <label v-for="option in question.options" :key="option" class="option">
                <input type="radio" :name="`question-${index}`" :value="option" v-model="answers[index]" />
                {{ option }}
              </label>
            </div>
          </div>
        </div>
        <button @click="submitQuiz" class="btn-submit" :disabled="!allAnswersSelected">
          Проверить ответы
        </button>
        <div v-if="quizResult" class="quiz-result">
          <p>Результат: {{ quizResult }}%</p>
        </div>
      </div>

      <div v-if="lesson.type === 'code_challenge' && lesson.code_challenge_data" class="code-section">
        <h2>Практическое задание</h2>
        <div class="task-description" v-html="lesson.code_challenge_data.task"></div>
        <div class="code-editor">
          <textarea v-model="code" placeholder="Введите ваш код здесь..." class="code-textarea"></textarea>
        </div>
        <button @click="submitCode" class="btn-submit" :disabled="!code.trim()">
          Проверить код
        </button>
        <div v-if="codeResult" class="code-result">
          <pre>{{ codeResult }}</pre>
        </div>
      </div>

      <div class="lesson-actions">
        <button @click="markAsComplete" class="btn-complete" :disabled="isCompleted">
          {{ isCompleted ? '✓ Пройдено' : 'Отметить как пройденное' }}
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
      code, codeResult, submitCode, auth
    };
  }
};
</script>

<style scoped>
.lesson-page h1 { color: #16213e; margin: 1rem 0; }
.back-link { color: #4ecca3; text-decoration: none; font-size: 0.9rem; }
.back-link:hover { text-decoration: underline; }
.lesson-type-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-left: 1rem; }
.lesson-content { color: #333; line-height: 1.8; font-size: 1.05rem; margin: 2rem 0; }
.lesson-content :deep(h2) { color: #16213e; margin-top: 2rem; }
.lesson-content :deep(h3) { color: #16213e; margin-top: 1.5rem; }
.lesson-content :deep(code) { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; }
.lesson-content :deep(pre) { background: #1a1a2e; color: #e0e0e0; padding: 1.5rem; border-radius: 8px; overflow-x: auto; }
.video-container { margin: 2rem 0; border-radius: 10px; overflow: hidden; }
.video-player { width: 100%; max-height: 500px; background: #000; }
.quiz-section, .code-section { background: #f8f9fa; padding: 2rem; border-radius: 10px; margin: 2rem 0; }
.question { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e9ecef; }
.options { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
.option { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 5px; cursor: pointer; }
.option:hover { background: #e9ecef; }
.code-editor { margin: 1rem 0; }
.code-textarea { width: 100%; min-height: 200px; font-family: 'Courier New', monospace; font-size: 0.9rem; padding: 1rem; border: 2px solid #ddd; border-radius: 8px; background: #1a1a2e; color: #e0e0e0; resize: vertical; }
.btn-submit { background: #4ecca3; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: background 0.3s; }
.btn-submit:hover:not(:disabled) { background: #3db892; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.quiz-result { margin-top: 1rem; padding: 1rem; border-radius: 8px; background: #d4edda; color: #155724; }
.code-result { margin-top: 1rem; padding: 1rem; border-radius: 8px; background: #f8d7da; color: #721c24; }
.code-result pre { background: #1a1a2e; color: #e0e0e0; padding: 1rem; border-radius: 5px; }
.lesson-actions { margin-top: 2rem; text-align: center; }
.btn-complete { background: #4ecca3; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: all 0.3s; }
.btn-complete:hover:not(:disabled) { background: #3db892; transform: translateY(-2px); }
.btn-complete:disabled { background: #a0a0c0; cursor: not-allowed; }
.loading { text-align: center; padding: 3rem; color: #666; }
</style>
