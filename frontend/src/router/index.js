import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const adminOnly = (to, from, next) => {
  const auth = useAuthStore();
  if (!auth.isAuthenticated || auth.user?.role !== 'admin') {
    next({ name: 'Login' });
  } else {
    next();
  }
};

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: 'Home' }
  },
  {
    path: '/courses',
    name: 'Courses',
    component: () => import('@/views/Courses.vue'),
    meta: { title: 'Courses' }
  },
  {
    path: '/course/:slug',
    name: 'CourseDetail',
    component: () => import('@/views/CourseDetail.vue'),
    meta: { title: 'Course Detail' }
  },
  {
    path: '/lesson/:id',
    name: 'Lesson',
    component: () => import('@/views/Lesson.vue'),
    meta: { title: 'Lesson' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: 'Dashboard' },
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next({ name: 'Login' });
      } else {
        next();
      }
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Auth.vue'),
    meta: { title: 'Login', hideNavbar: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Auth.vue'),
    meta: { title: 'Register', hideNavbar: true }
  },
  {
    path: '/certificates/:code',
    name: 'Certificate',
    component: () => import('@/views/CertificateView.vue'),
    meta: { title: 'Сертификат' }
  },
  {
    path: '/admin/courses',
    name: 'AdminCourses',
    component: () => import('@/views/Admin/Courses.vue'),
    meta: { title: 'Admin - Courses' },
    beforeEnter: adminOnly
  },
  {
    path: '/admin/courses/create',
    name: 'CreateCourse',
    component: () => import('@/views/Admin/CourseForm.vue'),
    meta: { title: 'Create Course' },
    beforeEnter: adminOnly
  },
  {
    path: '/admin/courses/:id/edit',
    name: 'EditCourse',
    component: () => import('@/views/Admin/CourseForm.vue'),
    meta: { title: 'Edit Course' },
    beforeEnter: adminOnly
  },
  {
    path: '/admin/stats',
    name: 'AdminStats',
    component: () => import('@/views/Admin/Stats.vue'),
    meta: { title: 'Admin - Statistics' },
    beforeEnter: adminOnly
  },
  {
    path: '/admin/stats/:courseId/students/:userId',
    name: 'AdminStudentStats',
    component: () => import('@/views/Admin/StudentStats.vue'),
    meta: { title: 'Admin - Student' },
    beforeEnter: adminOnly
  },
  {
    path: '/admin/certificates',
    name: 'AdminCertificates',
    component: () => import('@/views/Admin/Certificates.vue'),
    meta: { title: 'Admin - Certificates' },
    beforeEnter: adminOnly
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'Edu ISR'} | Edu ISR`;
  next();
});

export default router;
