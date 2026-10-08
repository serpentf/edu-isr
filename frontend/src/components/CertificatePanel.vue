<template>
  <div class="card shadow-sm mb-4">
    <div class="card-body">
      <h2 class="h5 card-title"><i class="bi bi-award me-2 text-primary" aria-hidden="true"></i>Сертификат</h2>

      <p v-if="!auth.isAuthenticated" class="mb-0 text-body-secondary">
        Сдайте все тесты и практические задания курса и получите именной сертификат с проверкой подлинности.
        <router-link :to="`/login?redirect=${encodeURIComponent($route.fullPath)}`">Войдите</router-link>, чтобы отслеживать прогресс.
      </p>

      <div v-else-if="loading" class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>

      <div v-else-if="loadError" class="alert alert-danger mb-0">{{ loadError }}</div>

      <template v-else-if="status">
        <!-- Already issued -->
        <div v-if="status.certificate">
          <div v-if="status.certificate.revoked_at" class="alert alert-warning mb-2">Сертификат отозван администратором.</div>
          <p v-else class="mb-2">Курс пройден, сертификат выдан на имя <strong>{{ status.certificate.full_name }}</strong>.</p>
          <router-link :to="`/certificates/${status.certificate.code}`" class="btn btn-outline-primary">
            <i class="bi bi-file-earmark-text me-1" aria-hidden="true"></i>Открыть сертификат
          </router-link>
        </div>

        <!-- Requirements -->
        <template v-else>
          <p class="mb-2 text-body-secondary">
            Нужно сдать все тесты (от {{ status.pass_score }}%) и решить практические задания с автоматической проверкой.
          </p>
          <div class="progress mb-2" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"
               :aria-label="`Выполнено ${passedCount} из ${status.items.length}`">
            <div class="progress-bar bg-success" :style="{ width: percent + '%' }"></div>
          </div>
          <p class="small mb-3">Выполнено {{ passedCount }} из {{ status.items.length }}</p>

          <details v-if="remaining.length" class="mb-0">
            <summary class="small">Осталось: {{ remaining.length }}</summary>
            <ul class="list-unstyled small mt-2 mb-0">
              <li v-for="item in remaining" :key="item.lesson_id" class="mb-1">
                <i class="bi me-1 text-body-secondary" :class="lessonTypeIcon(item.type)" aria-hidden="true"></i>
                <router-link :to="`/lesson/${item.lesson_id}`">{{ item.title }}</router-link>
                <span v-if="item.score !== null" class="text-body-secondary"> — лучший результат {{ item.score }}%</span>
              </li>
            </ul>
          </details>

          <form v-if="status.eligible" novalidate @submit.prevent="issue">
            <div class="alert alert-success">Все требования выполнены. Средний балл за тесты: {{ status.score }}%.</div>
            <label for="certificate-name" class="form-label">Имя и фамилия для сертификата</label>
            <div class="input-group has-validation">
              <input id="certificate-name" v-model="fullName" type="text" class="form-control"
                     :class="{ 'is-invalid': issueError }" maxlength="150" autocomplete="name" required
                     aria-describedby="certificate-name-help">
              <button type="submit" class="btn btn-primary" :disabled="issuing || fullName.trim().length < 3">
                <span v-if="issuing" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                Получить сертификат
              </button>
              <div v-if="issueError" class="invalid-feedback">{{ issueError }}</div>
            </div>
            <div id="certificate-name-help" class="form-text">Имя печатается на сертификате и после выдачи не меняется.</div>
          </form>
        </template>
      </template>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { certificatesAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { lessonTypeIcon } from '@/utils/badges';

export default {
  name: 'CertificatePanel',
  props: {
    courseId: { type: Number, required: true }
  },
  setup(props) {
    const auth = useAuthStore();
    const router = useRouter();
    const status = ref(null);
    const loading = ref(false);
    const loadError = ref(null);
    const fullName = ref(auth.user?.name || '');
    const issuing = ref(false);
    const issueError = ref(null);

    const passedCount = computed(() => status.value?.items.filter((i) => i.passed).length || 0);
    const percent = computed(() =>
      status.value?.items.length ? Math.round((passedCount.value / status.value.items.length) * 100) : 0
    );
    const remaining = computed(() => status.value?.items.filter((i) => !i.passed) || []);

    const load = async () => {
      if (!auth.isAuthenticated) return;
      loading.value = true;
      try {
        const { data } = await certificatesAPI.status(props.courseId);
        status.value = data;
      } catch (error) {
        loadError.value = error.response?.data?.error || 'Не удалось загрузить статус сертификата';
      } finally {
        loading.value = false;
      }
    };

    const issue = async () => {
      issuing.value = true;
      issueError.value = null;
      try {
        const { data } = await certificatesAPI.issue(props.courseId, fullName.value);
        router.push(`/certificates/${data.code}`);
      } catch (error) {
        issueError.value = error.response?.data?.error || 'Не удалось выдать сертификат';
      } finally {
        issuing.value = false;
      }
    };

    onMounted(load);

    return {
      auth, status, loading, loadError, fullName, issuing, issueError,
      passedCount, percent, remaining, issue, lessonTypeIcon
    };
  }
};
</script>
