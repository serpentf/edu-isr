<template>
  <div>
    <AdminTabs />

    <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
      <h1 class="h3 mb-0">Статистика</h1>
      <div v-if="courses.length" class="d-flex flex-wrap align-items-end gap-2">
        <div>
          <label for="stats-course" class="form-label small mb-1">Курс</label>
          <select id="stats-course" v-model.number="courseId" class="form-select">
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}{{ course.is_published ? '' : ' (черновик)' }}
            </option>
          </select>
        </div>
        <button type="button" class="btn btn-outline-secondary" :disabled="!stats || !stats.students.length" @click="exportCsv">
          <i class="bi bi-download me-1" aria-hidden="true"></i>CSV
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="!courses.length" class="alert alert-info">Курсов пока нет.</div>

    <template v-else-if="stats">
      <!-- Headline numbers -->
      <div class="row row-cols-2 row-cols-md-3 row-cols-xl-6 g-3 mb-4">
        <div v-for="tile in tiles" :key="tile.label" class="col">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="small text-body-secondary mb-1">
                <i class="bi me-1" :class="tile.icon" aria-hidden="true"></i>{{ tile.label }}
              </div>
              <div class="fs-2 fw-semibold lh-1">{{ tile.value }}</div>
              <div v-if="tile.note" class="small text-body-secondary mt-1">{{ tile.note }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Students -->
      <div class="card shadow-sm mb-4">
        <div class="card-header">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <h2 class="h5 mb-0 me-auto">Студенты</h2>
            <label for="stats-search" class="visually-hidden">Поиск по имени или email</label>
            <input id="stats-search" v-model="search" type="search" class="form-control form-control-sm w-auto"
                   placeholder="Имя или email">
            <label for="stats-status" class="visually-hidden">Статус</label>
            <select id="stats-status" v-model="statusFilter" class="form-select form-select-sm w-auto">
              <option value="">Все статусы</option>
              <option v-for="option in STUDENT_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>

        <div v-if="!stats.students.length" class="card-body text-body-secondary">
          Курс ещё никто не начинал.
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Студент</th>
                <th>Требования</th>
                <th class="text-end">Тесты</th>
                <th class="text-end">Средний балл</th>
                <th>Активность</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in filteredStudents" :key="student.id">
                <td>
                  <router-link :to="`/admin/stats/${courseId}/students/${student.id}`" class="fw-semibold">{{ student.name }}</router-link>
                  <div class="small text-body-secondary">{{ student.email }}</div>
                </td>
                <td class="text-nowrap">
                  <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" role="progressbar"
                         :aria-label="`Требования: ${student.required_passed} из ${stats.totals.required_total}`"
                         :aria-valuenow="student.required_passed" aria-valuemin="0" :aria-valuemax="stats.totals.required_total">
                      <div class="progress-bar" :style="{ width: percent(student.required_passed, stats.totals.required_total) + '%' }"></div>
                    </div>
                    <span class="small">{{ student.required_passed }}/{{ stats.totals.required_total }}</span>
                  </div>
                </td>
                <td class="text-end text-nowrap">{{ student.quizzes_passed }}/{{ stats.totals.quizzes_total }}</td>
                <td class="text-end">{{ student.average_quiz_score === null ? '—' : student.average_quiz_score + '%' }}</td>
                <td class="small text-nowrap" :title="formatDateTime(student.last_activity)">{{ formatRelative(student.last_activity) }}</td>
                <td>
                  <span class="badge" :class="studentStatus(student.status).class">
                    <i class="bi me-1" :class="studentStatus(student.status).icon" aria-hidden="true"></i>{{ studentStatus(student.status).label }}
                  </span>
                </td>
              </tr>
              <tr v-if="!filteredStudents.length">
                <td colspan="6" class="text-center text-body-secondary py-4">Никто не подходит под фильтр.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="stats.students.length" class="card-footer small text-body-secondary">
          Показано {{ filteredStudents.length }} из {{ stats.students.length }}. Учитываются студенты, начавшие курс; администраторы не учитываются.
        </div>
      </div>

      <!-- Lessons -->
      <div class="card shadow-sm">
        <div class="card-header">
          <h2 class="h5 mb-0">Прохождение по урокам</h2>
          <div class="small text-body-secondary">Доля от {{ stats.totals.students }} начавших курс</div>
        </div>
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Урок</th>
                <th class="text-end">Начали</th>
                <th>Прошли</th>
                <th class="text-end">Средний балл</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in lessonGroups" :key="group.module">
                <tr class="table-group-divider">
                  <th colspan="4" class="small text-body-secondary fw-semibold">{{ group.module }}</th>
                </tr>
                <tr v-for="lesson in group.lessons" :key="lesson.lesson_id">
                  <td>
                    <i class="bi me-1 text-body-secondary" :class="lessonTypeIcon(lesson.type)" aria-hidden="true"></i>
                    <router-link :to="`/lesson/${lesson.lesson_id}`">{{ lesson.title }}</router-link>
                    <span v-if="lesson.required" class="badge text-bg-light border ms-1" title="Нужен для сертификата">для сертификата</span>
                  </td>
                  <td class="text-end">{{ lesson.started }}</td>
                  <td class="text-nowrap">
                    <div class="d-flex align-items-center gap-2">
                      <div class="progress flex-grow-1" role="progressbar"
                           :aria-label="`Прошли: ${lesson.completed} из ${stats.totals.students}`"
                           :aria-valuenow="lesson.completed" aria-valuemin="0" :aria-valuemax="stats.totals.students">
                        <div class="progress-bar" :style="{ width: percent(lesson.completed, stats.totals.students) + '%' }"></div>
                      </div>
                      <span class="small">{{ lesson.completed }}</span>
                    </div>
                  </td>
                  <td class="text-end text-nowrap">
                    <template v-if="lesson.average_score !== null">
                      {{ lesson.average_score }}%
                      <span v-if="lesson.average_score < PASS_SCORE" class="badge text-bg-warning ms-1">
                        <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>сложный
                      </span>
                    </template>
                    <span v-else class="text-body-secondary">—</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { statsAPI } from '@/api';
import AdminTabs from '@/components/AdminTabs.vue';
import { lessonTypeIcon, studentStatus, STUDENT_STATUS_OPTIONS } from '@/utils/badges';
import { formatDate, formatDateTime, formatRelative } from '@/utils/dates';

// Same threshold as on the server: a quiz with a lower average is flagged as hard
const PASS_SCORE = 70;

export default {
  name: 'AdminStats',
  components: { AdminTabs },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const courses = ref([]);
    const courseId = ref(null);
    const stats = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const search = ref('');
    const statusFilter = ref('');

    const percent = (value, total) => (total ? Math.round((value / total) * 100) : 0);

    const tiles = computed(() => {
      const t = stats.value.totals;
      return [
        { label: 'Зарегистрировано', value: t.registered_users, icon: 'bi-people', note: 'студентов' },
        { label: 'Начали курс', value: t.students, icon: 'bi-play-circle', note: t.registered_users ? `${percent(t.students, t.registered_users)}% от всех` : null },
        { label: 'В процессе', value: t.in_progress, icon: 'bi-hourglass-split' },
        { label: 'Выполнили требования', value: t.completed, icon: 'bi-check2-circle', note: 'без сертификата' },
        { label: 'Сертификат получен', value: t.certified, icon: 'bi-award' },
        { label: 'Сертификат отозван', value: t.revoked, icon: 'bi-x-octagon' }
      ];
    });

    const filteredStudents = computed(() => {
      const query = search.value.trim().toLowerCase();
      return stats.value.students.filter((s) =>
        (!statusFilter.value || s.status === statusFilter.value) &&
        (!query || s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query))
      );
    });

    const lessonGroups = computed(() => {
      const groups = [];
      for (const lesson of stats.value.lessons) {
        const last = groups[groups.length - 1];
        if (last?.module === lesson.module_title) last.lessons.push(lesson);
        else groups.push({ module: lesson.module_title, lessons: [lesson] });
      }
      return groups;
    });

    const loadCourse = async () => {
      if (!courseId.value) return;
      loading.value = true;
      error.value = null;
      try {
        stats.value = (await statsAPI.course(courseId.value)).data;
      } catch (err) {
        error.value = err.response?.data?.error || 'Не удалось загрузить статистику';
      } finally {
        loading.value = false;
      }
    };

    // Excel-friendly CSV: UTF-8 with BOM and ";" as the separator
    const exportCsv = () => {
      const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const t = stats.value.totals;
      const rows = [
        ['Имя', 'Email', 'Статус', 'Требования', 'Тесты сдано', 'Средний балл, %', 'Начал', 'Последняя активность', 'Сертификат'],
        ...filteredStudents.value.map((s) => [
          s.name, s.email, studentStatus(s.status).label,
          `${s.required_passed}/${t.required_total}`, `${s.quizzes_passed}/${t.quizzes_total}`,
          s.average_quiz_score ?? '', formatDate(s.started_at), formatDateTime(s.last_activity), s.certificate_code || ''
        ])
      ];
      const csv = '﻿' + rows.map((row) => row.map(quote).join(';')).join('\r\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      link.download = `statistics-${stats.value.course.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    };

    // The selected course is kept in the URL, so the page can be bookmarked and shared
    watch(courseId, (id, previous) => {
      if (previous !== null) router.replace({ query: { ...route.query, course: id } });
      loadCourse();
    });

    onMounted(async () => {
      try {
        courses.value = (await statsAPI.courses()).data;
        const requested = Number(route.query.course);
        courseId.value = courses.value.some((c) => c.id === requested) ? requested : courses.value[0]?.id ?? null;
        if (!courseId.value) loading.value = false;
      } catch (err) {
        error.value = err.response?.data?.error || 'Не удалось загрузить список курсов';
        loading.value = false;
      }
    });

    return {
      courses, courseId, stats, loading, error, search, statusFilter, tiles, filteredStudents, lessonGroups,
      percent, exportCsv, lessonTypeIcon, studentStatus, STUDENT_STATUS_OPTIONS, formatDateTime, formatRelative, PASS_SCORE
    };
  }
};
</script>
