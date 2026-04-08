-- ============================================
-- ChatGPT 스타일 채팅 앱 - 전체 마이그레이션
-- ============================================
-- 사용법: mysql -u user -p database < MIGRATION_ALL.sql

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `username` varchar(64) UNIQUE,
  `passwordHash` varchar(255),
  `openId` varchar(64) UNIQUE,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64) DEFAULT 'local',
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL,
  `rejectionReason` text,
  `groupId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `users_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 대화 테이블
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
  CONSTRAINT `conversations_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 메시지 테이블
CREATE TABLE IF NOT EXISTS `messages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `conversationId` int NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `messages_id` PRIMARY KEY(`id`),
  CONSTRAINT `messages_conversationId_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 사용자 그룹 테이블
CREATE TABLE IF NOT EXISTS `userGroups` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `userGroups_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 사용자-그룹 매핑 테이블
CREATE TABLE IF NOT EXISTS `userGroupMembers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `groupId` int NOT NULL,
  `joinedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `userGroupMembers_id` PRIMARY KEY(`id`),
  CONSTRAINT `userGroupMembers_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `userGroupMembers_groupId_fk` FOREIGN KEY (`groupId`) REFERENCES `userGroups` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `userGroupMembers_unique` (`userId`, `groupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 내부 파일 테이블
CREATE TABLE IF NOT EXISTS `internalFiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `filename` varchar(255) NOT NULL,
  `fileKey` varchar(512) NOT NULL,
  `fileUrl` varchar(512) NOT NULL,
  `mimeType` varchar(100),
  `fileSize` int,
  `content` text,
  `uploadedBy` int NOT NULL,
  `uploadedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `internalFiles_id` PRIMARY KEY(`id`),
  CONSTRAINT `internalFiles_uploadedBy_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS `idx_conversations_userId` ON `conversations` (`userId`);
CREATE INDEX IF NOT EXISTS `idx_messages_conversationId` ON `messages` (`conversationId`);
CREATE INDEX IF NOT EXISTS `idx_userGroupMembers_userId` ON `userGroupMembers` (`userId`);
CREATE INDEX IF NOT EXISTS `idx_userGroupMembers_groupId` ON `userGroupMembers` (`groupId`);
CREATE INDEX IF NOT EXISTS `idx_internalFiles_uploadedBy` ON `internalFiles` (`uploadedBy`);
CREATE INDEX IF NOT EXISTS `idx_users_username` ON `users` (`username`);
CREATE INDEX IF NOT EXISTS `idx_users_email` ON `users` (`email`);

-- 8. 기본 관리자 사용자 생성 (선택사항)
-- 주석을 제거하고 비밀번호를 변경하여 사용하세요
-- INSERT INTO `users` 
-- (`username`, `passwordHash`, `name`, `email`, `loginMethod`, `role`, `status`, `createdAt`, `updatedAt`, `lastSignedIn`)
-- VALUES 
-- ('admin', '$2b$10$...', 'Administrator', 'admin@example.com', 'local', 'admin', 'approved', NOW(), NOW(), NOW());

-- 마이그레이션 완료
SELECT '모든 테이블이 성공적으로 생성되었습니다.' AS migration_status;
