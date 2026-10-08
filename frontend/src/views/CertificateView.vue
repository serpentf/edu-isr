<template>
  <div class="row justify-content-center">
    <div class="col-lg-10 col-xl-9">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </div>

      <div v-else-if="notFound" class="alert alert-danger">
        <h1 class="h5">Сертификат не найден</h1>
        <p class="mb-0">Сертификата с кодом <span class="font-monospace">{{ code }}</span> не существует. Проверьте код.</p>
      </div>

      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <template v-else-if="certificate">
        <div v-if="certificate.revoked" class="alert alert-danger d-flex gap-2 align-items-start">
          <i class="bi bi-x-octagon-fill" aria-hidden="true"></i>
          <div><strong>Сертификат отозван</strong> {{ formatDate(certificate.revoked_at) }} и недействителен.</div>
        </div>
        <div v-else class="alert alert-success d-flex gap-2 align-items-start d-print-none">
          <i class="bi bi-patch-check-fill" aria-hidden="true"></i>
          <div><strong>Сертификат подлинный.</strong> Он выдан платформой Edu ISR и действителен.</div>
        </div>

        <!-- The certificate itself -->
        <div class="card border-primary border-3 shadow-sm mb-4">
          <div class="card-body p-4 p-md-5 text-center">
            <i class="bi bi-mortarboard-fill display-4 text-primary" aria-hidden="true"></i>
            <p class="text-uppercase text-body-secondary small mb-1 mt-3">Edu ISR · Интерактивные курсы</p>
            <h1 class="display-6 fw-bold mb-4">Сертификат</h1>

            <p class="mb-1">подтверждает, что</p>
            <p class="h2 fw-semibold border-bottom border-2 d-inline-block px-4 pb-2 mb-3">{{ certificate.full_name }}</p>
            <p class="mb-1">успешно прошёл(-ла) курс</p>
            <p class="h4 fw-semibold mb-4">«{{ certificate.course.title }}»</p>

            <p class="mb-4">Средний результат итоговых и промежуточных тестов: <strong>{{ Math.round(certificate.score) }}%</strong></p>

            <div class="row align-items-center g-3 text-start border-top pt-4">
              <div class="col-sm">
                <div class="small text-body-secondary">Дата выдачи</div>
                <div class="fw-semibold">{{ formatDate(certificate.issued_at) }}</div>
                <div class="small text-body-secondary mt-2">Номер сертификата</div>
                <div class="fw-semibold font-monospace">{{ certificate.code }}</div>
                <div class="small text-body-secondary mt-2">Проверка подлинности</div>
                <div class="small text-break">{{ verifyUrl }}</div>
              </div>
              <div class="col-sm-auto text-center">
                <div class="d-inline-block" v-html="qrSvg"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 justify-content-center d-print-none">
          <button type="button" class="btn btn-primary" @click="print">
            <i class="bi bi-printer me-1" aria-hidden="true"></i>Печать или PDF
          </button>
          <button type="button" class="btn btn-outline-secondary" @click="copyLink">
            <i class="bi me-1" :class="copied ? 'bi-check-lg' : 'bi-link-45deg'" aria-hidden="true"></i>{{ copied ? 'Ссылка скопирована' : 'Скопировать ссылку' }}
          </button>
          <router-link :to="`/course/${certificate.course.slug}`" class="btn btn-outline-secondary">О курсе</router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import QRCode from 'qrcode';
import { certificatesAPI } from '@/api';

export default {
  name: 'CertificateView',
  setup() {
    const route = useRoute();
    const code = computed(() => String(route.params.code || '').toUpperCase());
    const certificate = ref(null);
    const loading = ref(true);
    const notFound = ref(false);
    const error = ref(null);
    const qrSvg = ref('');
    const copied = ref(false);

    const verifyUrl = computed(() => `${window.location.origin}/certificates/${code.value}`);

    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    const load = async () => {
      try {
        const { data } = await certificatesAPI.verify(code.value);
        certificate.value = data;
        // QR code leads to this verification page; rendered locally, no external service
        qrSvg.value = await QRCode.toString(verifyUrl.value, { type: 'svg', margin: 1, width: 128 });
      } catch (err) {
        if (err.response?.status === 404) notFound.value = true;
        else error.value = err.response?.data?.error || 'Не удалось загрузить сертификат';
      } finally {
        loading.value = false;
      }
    };

    const print = () => window.print();

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(verifyUrl.value);
        copied.value = true;
        setTimeout(() => { copied.value = false; }, 2000);
      } catch {
        window.prompt('Скопируйте ссылку:', verifyUrl.value);
      }
    };

    onMounted(load);

    return { code, certificate, loading, notFound, error, qrSvg, verifyUrl, formatDate, print, copyLink, copied };
  }
};
</script>
