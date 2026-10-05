-- Edu ISR Seed Data
-- Sample data for testing the application

-- Insert admin user (password hash for 'admin123')
INSERT INTO `Users` (`email`, `password`, `name`, `role`, `is_active`) VALUES
('admin@edu-isr.com', '$2a$10$YgNQbqXzjq3bJiCMvpzFf.RnXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'Admin User', 'admin', 1),
('student@edu-isr.com', '$2a$10$YgNQbqXzjq3bJiCMvpzFf.RnXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'Student User', 'student', 1);

-- Insert sample courses
INSERT INTO `Courses` (`title`, `description`, `slug`, `level`, `duration_hours`, `is_published`, `created_by`) VALUES
('Основы Git', 'Изучите основы работы с системой контроля версий Git', 'basics-of-git', 'beginner', 5, 1, 1),
('Vue.js для начинающих', 'Создайте первое приложение на Vue.js', 'vuejs-beginners', 'beginner', 8, 1, 1),
('Node.js Backend', 'Создание серверных приложений на Node.js', 'nodejs-backend', 'intermediate', 12, 1, 1);

-- Insert modules for Git course (course_id = 1)
INSERT INTO `Modules` (`course_id`, `title`, `order_index`) VALUES
(1, 'Введение в Git', 1),
(1, 'Основные команды', 2),
(1, 'Работа с удалённым репозиторием', 3);

-- Insert modules for Vue.js course (course_id = 2)
INSERT INTO `Modules` (`course_id`, `title`, `order_index`) VALUES
(2, 'Введение в Vue.js', 1),
(2, 'Компоненты и директивы', 2),
(2, 'Состояние и API', 3);

-- Insert modules for Node.js course (course_id = 3)
INSERT INTO `Modules` (`course_id`, `title`, `order_index`) VALUES
(3, 'Введение в Node.js', 1),
(3, 'Express.js', 2),
(3, 'Работа с базой данных', 3);
