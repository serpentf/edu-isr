import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authAPI } from '@/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('token') || null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  // Initialize from localStorage
  const init = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      user.value = JSON.parse(storedUser);
    }
  };

  const register = async (data) => {
    loading.value = true;
    try {
      const response = await authAPI.register(data);
      setAuth(response.data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Registration failed' };
    } finally {
      loading.value = false;
    }
  };

  const login = async (data) => {
    loading.value = true;
    try {
      const response = await authAPI.login(data);
      setAuth(response.data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Login failed' };
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // The role cached in localStorage is only a hint: confirm the user with the server
  const verify = async () => {
    if (!token.value) return;
    try {
      await fetchMe();
    } catch {
      // fetchMe already logged out
    }
  };

  const fetchMe = async () => {
    try {
      const response = await authAPI.getMe();
      user.value = response.data;
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      logout();
      throw error;
    }
  };

  const setAuth = (data) => {
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  init();

  return { user, token, loading, isAuthenticated, isAdmin, register, login, logout, fetchMe, verify };
});
