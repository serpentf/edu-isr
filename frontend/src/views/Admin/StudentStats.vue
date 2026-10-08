<template>
  <div>
    <AdminTabs />

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-else-if="data">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link :to="`/admin/stats?course=${data.course.id}`">Статистика</router-link></li>
          <li class="breadcrumb-item">{{ data.course.title }}</li>
          <li class="breadcrumb-item active" aria-current="page">{{ data.user.name }}</li>
        </ol>
      </nav>

      <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
        <h1 class="h3 mb-0 me-2">{{ data.user.name }}</h1>
        <span class="badge" :class="studentStatus(status).class">
          <i class="bi me-1" :class="studentStatus(status).icon" aria-hidden="true"></i>{{ studentStatus(status).label }}
        </span>
        <span v-if="!data.user.is_active" class="badge text-bg-secondary">Аккаунт деактивирован</span>
      </div>
      <p class="text-body-secondary mb-4">
        {{ data.user.email }} · зарегистрирован {{ formatDate(data.user.createdAt) }}
        <template v-if="data.certificate">
          · сертификат <router-link :to="`/certificates/${data.certificate.code}`" class="font-monospace">{{ data.certificate.code }}</router-link>
        </template>
      </p>

      <div class="row row-cols-1 row-cols-sm-3 g-3 mb-4">
        <div v-for="tile in tiles" :key="tile.label" class="col">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="small text-body-secondary mb-1">{{ tile.label }}</div>
              <div class="fs-3 fw-semibold lh-1">{{ tile.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Урок</th>
                <th>Статус</th>
                <th class="text-end">Балл</th>
                <th>Когда</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in groups" :key="group.module">
                <tr class="table-group-divider">
                  <th colspan="4" class="small text-body-secondary fw-semibold">{{ group.module }}</th>
                </tr>
                <template v-for="lesson in group.lessons" :key="lesson.lesson_id">
                  <tr>
                    <td>
                      <i class="bi me-1 text-body-secondary" :class="lessonTypeIcon(lesson.type)" aria-hidden="true"></i>{{ lesson.title }}
                      <span v-if="lesson.required" class="badge text-bg-light border ms-1">для сертификата</span>
                    </td>
                    <td class="text-nowrap">
                      <span v-if="lesson.completed" class="text-success"><i class="bi bi-check-circle-fill me-1" aria-hidden="true"></i>Пройден</span>
                      <span v-else-if="lesson.started" class="text-warning-emphasis"><i class="bi bi-hourglass-split me-1" aria-hidden="true"></i>Начат</span>
                      <span v-else class="text-body-secondary"><i class="bi bi-dash-circle me-1" aria-hidden="true"></i>Не начат</span>
                    </td>
                    <td class="text-end">{{ lesson.score === null ? '—' : Math.round(lesson.score) + '%' }}</td>
                    <td class="small text-nowrap">{{ lesson.completed_at ? formatDateTime(lesson.completed_at) : '—' }}</td>
                  </tr>
                  <tr v-if="lesson.code_submission">
                    <td colspan="4" class="border-top-0 pt-0">
                      <details class="small">
                        <summary>Отправленное решение</summary>
                        <pre class="border rounded mt-2 mb-0"><code class="hljs" v-html="highlight(lesson.code_submission, 'javascript')"></code></pre>
                      </details>
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { statsAPI } from '@/api';
import AdminTabs from '@/components/AdminTabs.vue';
import { lessonTypeIcon, studentStatus } from '@/utils/badges';
import { formatDate, formatDateTime } from '@/utils/dates';
import { highlight } from '@/utils/highlight';

export default {
  name: 'AdminStudentStats',
  components: { AdminTabs },
  setup() {
    const route = useRoute();
    const data = ref(null);
    const loading = ref(true);
    const error = ref(null);

    const required = computed(() => data.value.lessons.filter((l) => l.required));
    const requiredPassed = computed(() => required.value.filter((l) => l.completed).length);

    // Same rules as the server-side statistics
    const status = computed(() => {
      if (data.value.certificate?.revoked_at) return 'revoked';
      if (data.value.certificate) return 'certified';
      if (required.value.length && requiredPassed.value === required.value.length) return 'completed';
      return 'in_progress';
    });

    const tiles = computed(() => {
      const scores = data.value.lessons.filter((l) => l.type === 'quiz' && l.score !== null).map((l) => l.score);
      return [
        { label: 'Требования для сертификата', value: `${requiredPassed.value} из ${required.value.length}` },
        { label: 'Пройдено уроков', value: `${data.value.lessons.filter((l) => l.completed).length} из ${data.value.lessons.length}` },
        { label: 'Средний балл за тесты', value: scores.length ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%` : '—' }
      ];
    });

    const groups = computed(() => {
      const result = [];
      for (const lesson of data.value.lessons) {
        const last = result[result.length - 1];
        if (last?.module === lesson.module_title) last.lessons.push(lesson);
        else result.push({ module: lesson.module_title, lessons: [lesson] });
      }
      return result;
    });

    onMounted(async () => {
      try {
        data.value = (await statsAPI.student(route.params.courseId, route.params.userId)).data;
      } catch (err) {
        error.value = err.response?.data?.error || 'Не удалось загрузить данные студента';
      } finally {
        loading.value = false;
      }
    });

    return { data, loading, error, status, tiles, groups, lessonTypeIcon, studentStatus, formatDate, formatDateTime, highlight };
  }
};
</script>
