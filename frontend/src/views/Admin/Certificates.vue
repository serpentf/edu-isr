<template>
  <div>
    <AdminTabs />
    <h1 class="h3 mb-4">Выданные сертификаты</h1>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Номер</th>
              <th>Имя на сертификате</th>
              <th>Пользователь</th>
              <th>Курс</th>
              <th>Балл</th>
              <th>Выдан</th>
              <th>Статус</th>
              <th><span class="visually-hidden">Действия</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="certificate in certificates" :key="certificate.id">
              <td class="font-monospace text-nowrap">
                <router-link :to="`/certificates/${certificate.code}`">{{ certificate.code }}</router-link>
              </td>
              <td>{{ certificate.full_name }}</td>
              <td class="small">{{ certificate.user?.email }}</td>
              <td class="small">{{ certificate.course?.title }}</td>
              <td>{{ Math.round(certificate.score) }}%</td>
              <td class="text-nowrap small">{{ formatDate(certificate.issued_at) }}</td>
              <td>
                <span v-if="certificate.revoked_at" class="badge text-bg-danger" :title="certificate.revoke_reason || ''">Отозван</span>
                <span v-else class="badge text-bg-success">Действует</span>
              </td>
              <td class="text-end">
                <button v-if="!certificate.revoked_at" type="button" class="btn btn-sm btn-outline-danger"
                        :disabled="revokingId === certificate.id" @click="revoke(certificate)">
                  <i class="bi bi-x-octagon me-1" aria-hidden="true"></i>Отозвать
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="certificates.length === 0" class="alert alert-info m-3">Сертификаты ещё не выдавались.</div>
    </div>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';
import { certificatesAPI } from '@/api';
import AdminTabs from '@/components/AdminTabs.vue';

export default {
  name: 'AdminCertificates',
  components: { AdminTabs },
  setup() {
    const certificates = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const revokingId = ref(null);

    const formatDate = (value) => new Date(value).toLocaleDateString('ru-RU');

    const load = async () => {
      try {
        const { data } = await certificatesAPI.list();
        certificates.value = data;
      } catch (err) {
        error.value = err.response?.data?.error || 'Не удалось загрузить сертификаты';
      } finally {
        loading.value = false;
      }
    };

    const revoke = async (certificate) => {
      const reason = window.prompt(`Отозвать сертификат ${certificate.code} (${certificate.full_name})? Укажите причину:`);
      if (reason === null) return;
      revokingId.value = certificate.id;
      try {
        const { data } = await certificatesAPI.revoke(certificate.id, reason);
        Object.assign(certificate, data);
      } catch (err) {
        window.alert(err.response?.data?.error || 'Не удалось отозвать сертификат');
      } finally {
        revokingId.value = null;
      }
    };

    onMounted(load);

    return { certificates, loading, error, revokingId, formatDate, revoke };
  }
};
</script>
