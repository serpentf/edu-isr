-- Edu ISR Database Initialization Script
-- This file is automatically executed when the MySQL container starts for the first time

-- Create users table
CREATE TABLE IF NOT EXISTS `Users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  `avatar` VARCHAR(500) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create courses table
CREATE TABLE IF NOT EXISTS `Courses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `level` ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  `duration_hours` FLOAT DEFAULT 0,
  `is_published` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by` INT UNSIGNED NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Courses_slug` (`slug`),
  KEY `Courses_is_published` (`is_published`),
  KEY `Courses_slug_2` (`slug`),
  CONSTRAINT `Courses_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create modules table
CREATE TABLE IF NOT EXISTS `Modules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `course_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `Modules_course_id` (`course_id`),
  KEY `Modules_course_id_order_index` (`course_id`, `order_index`),
  CONSTRAINT `Modules_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `Courses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create lessons table
CREATE TABLE IF NOT EXISTS `Lessons` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `module_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `type` ENUM('text', 'video', 'quiz', 'code_challenge') DEFAULT 'text',
  `video_url` VARCHAR(500) DEFAULT NULL,
  `quiz_data` JSON DEFAULT NULL,
  `code_challenge_data` JSON DEFAULT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `is_published` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `Lessons_module_id` (`module_id`),
  KEY `Lessons_module_id_order_index` (`module_id`, `order_index`),
  CONSTRAINT `Lessons_module_id_fk` FOREIGN KEY (`module_id`) REFERENCES `Modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_progress table
CREATE TABLE IF NOT EXISTS `UserProgress` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `lesson_id` INT UNSIGNED NOT NULL,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` DATETIME DEFAULT NULL,
  `quiz_score` FLOAT DEFAULT NULL,
  `code_submission` JSON DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserProgress_user_id_lesson_id` (`user_id`, `lesson_id`),
  KEY `UserProgress_user_id` (`user_id`),
  CONSTRAINT `UserProgress_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`),
  CONSTRAINT `UserProgress_lesson_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `Lessons` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
