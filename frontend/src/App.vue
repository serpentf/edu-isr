<template>
  <div id="app">
    <Navbar v-if="showNavbar" />
    <main class="main-content">
      <router-view />
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

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
