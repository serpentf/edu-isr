<template>
  <div>
    <div v-if="examples.length" class="d-flex flex-wrap gap-2 mb-3">
      <span class="small text-body-secondary align-self-center">Примеры:</span>
      <button v-for="(example, index) in examples" :key="index" type="button"
              class="btn btn-sm btn-outline-secondary font-monospace" @click="applyExample(example)">
        {{ example.method }} {{ example.path }}
      </button>
    </div>

    <form class="mb-3" @submit.prevent="send">
      <div class="input-group mb-2">
        <label class="visually-hidden" :for="`${uid}-method`">Метод</label>
        <select :id="`${uid}-method`" v-model="method" class="form-select flex-grow-0 w-auto font-monospace">
          <option v-for="m in METHODS" :key="m">{{ m }}</option>
        </select>
        <label class="visually-hidden" :for="`${uid}-path`">Путь</label>
        <input :id="`${uid}-path`" v-model="path" type="text" class="form-control font-monospace" placeholder="/products/1" required>
        <button type="submit" class="btn btn-primary">
          <i class="bi bi-send me-1" aria-hidden="true"></i>Отправить
        </button>
      </div>

      <div class="input-group input-group-sm mb-2">
        <label class="input-group-text font-monospace" :for="`${uid}-auth`">Authorization</label>
        <input :id="`${uid}-auth`" v-model="authorization" type="text" class="form-control font-monospace" placeholder="Bearer <токен> — пусто, если без авторизации">
      </div>

      <div v-if="hasBody">
        <label class="form-label small mb-1" :for="`${uid}-body`">Тело запроса (JSON)</label>
        <textarea :id="`${uid}-body`" v-model="bodyText" class="form-control font-monospace" rows="4"></textarea>
      </div>
    </form>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

    <div v-if="response" class="card mb-2">
      <div class="card-header d-flex flex-wrap align-items-center gap-2">
        <span class="badge" :class="statusClass">{{ response.status }}</span>
        <span class="font-monospace small">{{ lastRequest.method }} {{ lastRequest.path }}</span>
        <button type="button" class="btn btn-sm btn-outline-primary ms-auto" @click="emitTest">
          <i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Добавить как тест
        </button>
      </div>
      <pre class="mb-0 border-0 rounded-bottom"><code class="hljs" v-html="responseHtml"></code></pre>
    </div>

    <div class="d-flex flex-wrap align-items-center gap-2 small text-body-secondary">
      <span>Данные консоли сохраняются между запросами, а каждый тест начинает с исходных данных.</span>
      <button type="button" class="btn btn-sm btn-link p-0" @click="resetServer">Сбросить данные</button>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { createSandboxServer, requestToTest } from '@/utils/apiSandbox';
import { highlight } from '@/utils/highlight';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
let instances = 0;

export default {
  name: 'ApiConsole',
  props: {
    subject: { type: String, required: true },
    examples: { type: Array, default: () => [] }
  },
  emits: ['add-test'],
  setup(props, { emit }) {
    const uid = `api-console-${++instances}`;
    let server = createSandboxServer(props.subject);

    const method = ref('GET');
    const path = ref('/products');
    const authorization = ref('');
    const bodyText = ref('');
    const response = ref(null);
    const lastRequest = ref(null);
    const error = ref(null);

    const hasBody = computed(() => method.value === 'POST' || method.value === 'PUT');
    const responseHtml = computed(() => highlight(JSON.stringify(response.value?.body, null, 2) ?? '', 'json'));
    const statusClass = computed(() => {
      const status = response.value?.status || 0;
      if (status < 300) return 'text-bg-success';
      if (status < 500) return 'text-bg-warning';
      return 'text-bg-danger';
    });

    const send = () => {
      error.value = null;
      let body;
      if (hasBody.value && bodyText.value.trim()) {
        try {
          body = JSON.parse(bodyText.value);
        } catch {
          error.value = 'Тело запроса — некорректный JSON.';
          return;
        }
      }
      const headers = authorization.value.trim() ? { Authorization: authorization.value.trim() } : {};
      const request = { method: method.value, path: path.value.trim(), body, headers };
      try {
        response.value = server(request.method, request.path, request);
        lastRequest.value = request;
      } catch (err) {
        error.value = `Сервер упал: ${err.message}`;
      }
    };

    const applyExample = (example) => {
      method.value = example.method;
      path.value = example.path;
      authorization.value = example.authorization || '';
      bodyText.value = example.body === undefined ? '' : JSON.stringify(example.body, null, 2);
      send();
    };

    const emitTest = () => emit('add-test', requestToTest(lastRequest.value, response.value));

    const resetServer = () => {
      server = createSandboxServer(props.subject);
      response.value = null;
    };

    return {
      METHODS, uid, method, path, authorization, bodyText, response, lastRequest, error,
      hasBody, responseHtml, statusClass, send, applyExample, emitTest, resetServer
    };
  }
};
</script>
