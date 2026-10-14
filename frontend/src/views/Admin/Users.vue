<template>
  <div>
    <AdminTabs />
    <h1 class="h3 mb-4">Пользователи</h1>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-else>
      <div class="row mb-3">
        <div class="col-md-6 col-lg-4">
          <label for="users-search" class="visually-hidden">Поиск по имени или email</label>
          <input id="users-search" v-model="search" type="search" class="form-control" placeholder="Поиск по имени или email">
        </div>
      </div>

      <div v-if="saved" class="alert alert-success alert-dismissible" role="status">
        Пароль для {{ saved }} изменён. Передайте его пользователю.
        <button type="button" class="btn-close" aria-label="Закрыть" @click="saved = null"></button>
      </div>

      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Зарегистрирован</th>
                <th><span class="visually-hidden">Действия</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>
                  {{ user.name }}
                  <span v-if="!user.is_active" class="badge text-bg-secondary ms-1">Деактивирован</span>
                </td>
                <td class="small">{{ user.email }}</td>
                <td>
                  <span v-if="user.role === 'admin'" class="badge text-bg-primary">Админ</span>
                  <span v-else class="badge text-bg-light border">Студент</span>
                </td>
                <td class="text-nowrap small">{{ formatDate(user.createdAt) }}</td>
                <td class="text-end">
                  <button type="button" class="btn btn-sm btn-outline-secondary text-nowrap" @click="openPasswordForm(user)">
                    <i class="bi bi-key me-1" aria-hidden="true"></i>Сменить пароль
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredUsers.length === 0" class="alert alert-info m-3">
          {{ users.length === 0 ? 'Пользователей пока нет.' : 'Никого не нашлось.' }}
        </div>
      </div>
    </template>

    <div ref="modalEl" class="modal fade" tabindex="-1" aria-labelledby="password-modal-title" aria-hidden="true">
      <div class="modal-dialog">
        <form class="modal-content" novalidate @submit.prevent="savePassword">
          <div class="modal-header">
            <h2 id="password-modal-title" class="modal-title h5">Новый пароль</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
            <p v-if="target" class="mb-3">{{ target.name }} · <span class="text-body-secondary">{{ target.email }}</span></p>
            <label for="new-password" class="form-label">Пароль</label>
            <input id="new-password" ref="passwordInput" v-model="password" type="text" class="form-control font-monospace"
                   :class="{ 'is-invalid': formError }" autocomplete="off" maxlength="72" required>
            <div v-if="formError" class="invalid-feedback">{{ formError }}</div>
            <div class="form-text">От 8 до 72 символов. Текущие сессии пользователя продолжат работать.</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Отмена</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Modal } from 'bootstrap';
import { usersAPI } from '@/api';
import AdminTabs from '@/components/AdminTabs.vue';

export default {
  name: 'AdminUsers',
  components: { AdminTabs },
  setup() {
    const users = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const search = ref('');

    const modalEl = ref(null);
    const passwordInput = ref(null);
    const target = ref(null);
    const password = ref('');
    const formError = ref(null);
    const saving = ref(false);
    const saved = ref(null);
    let modal = null;

    const formatDate = (value) => new Date(value).toLocaleDateString('ru-RU');

    const filteredUsers = computed(() => {
      const query = search.value.trim().toLowerCase();
      if (!query) return users.value;
      return users.value.filter((user) =>
        user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query));
    });

    const load = async () => {
      try {
        const { data } = await usersAPI.getAll();
        users.value = data;
      } catch (err) {
        error.value = err.response?.data?.error || 'Не удалось загрузить пользователей';
      } finally {
        loading.value = false;
      }
    };

    const openPasswordForm = (user) => {
      target.value = user;
      password.value = '';
      formError.value = null;
      saved.value = null;
      modal.show();
    };

    const savePassword = async () => {
      if (password.value.length < 8) {
        formError.value = 'Пароль должен быть не короче 8 символов';
        return;
      }
      saving.value = true;
      formError.value = null;
      try {
        await usersAPI.setPassword(target.value.id, password.value);
        saved.value = target.value.email;
        modal.hide();
      } catch (err) {
        formError.value = err.response?.data?.error || 'Не удалось изменить пароль';
      } finally {
        saving.value = false;
      }
    };

    // The password must not stay in memory after the dialog closes
    const onHidden = () => {
      password.value = '';
      target.value = null;
    };
    const onShown = () => passwordInput.value?.focus();

    onMounted(() => {
      modal = new Modal(modalEl.value);
      modalEl.value.addEventListener('shown.bs.modal', onShown);
      modalEl.value.addEventListener('hidden.bs.modal', onHidden);
      load();
    });

    onBeforeUnmount(() => {
      modal?.dispose();
    });

    return {
      users, loading, error, search, filteredUsers, formatDate,
      modalEl, passwordInput, target, password, formError, saving, saved,
      openPasswordForm, savePassword
    };
  }
};
</script>
