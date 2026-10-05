<template>
  <div class="d-flex flex-column min-vh-100">
    <Navbar v-if="showNavbar" />
    <main class="flex-grow-1 py-4">
      <div class="container">
        <router-view />
      </div>
    </main>
    <Footer v-if="showFooter" />
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '@/components/Navbar.vue';
import Footer from '@/components/Footer.vue';

export default {
  name: 'App',
  components: {
    Navbar,
    Footer
  },
  setup() {
    const route = useRoute();

    const showNavbar = computed(() => !route.meta.hideNavbar);
    const showFooter = computed(() => !route.meta.hideFooter);

    return { showNavbar, showFooter };
  }
};
</script>
