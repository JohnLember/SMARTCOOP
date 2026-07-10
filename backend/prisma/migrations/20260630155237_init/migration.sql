-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'STAFF', 'MEMBER', 'MAO') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `member_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_member_id_key`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `member_no` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `middle_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `sex` VARCHAR(191) NULL,
    `birthdate` DATETIME(3) NULL,
    `address` VARCHAR(191) NULL,
    `barangay_id` INTEGER NULL,
    `contact_no` VARCHAR(191) NULL,
    `profile_photo` VARCHAR(191) NULL,
    `membership_type` ENUM('REGULAR', 'ASSOCIATE') NOT NULL DEFAULT 'ASSOCIATE',
    `share_capital` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `date_joined` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `priority_score` DECIMAL(8, 2) NULL,
    `rank_up_eligible` BOOLEAN NOT NULL DEFAULT false,
    `last_evaluated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `members_member_no_key`(`member_no`),
    INDEX `members_barangay_id_idx`(`barangay_id`),
    INDEX `members_membership_type_idx`(`membership_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `barangays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,

    UNIQUE INDEX `barangays_name_key`(`name`),
    UNIQUE INDEX `barangays_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loading_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `barangay_id` INTEGER NOT NULL,
    `period_type` ENUM('KINSINA', 'KATAPUSAN') NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'SETTLED') NOT NULL DEFAULT 'OPEN',

    INDEX `loading_batches_barangay_id_idx`(`barangay_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rubber_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `member_id` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `weight_kg` DECIMAL(10, 2) NOT NULL,
    `drc` DECIMAL(5, 2) NULL,
    `price_per_kg` DECIMAL(10, 2) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `delivery_date` DATETIME(3) NOT NULL,

    INDEX `rubber_deliveries_member_id_idx`(`member_id`),
    INDEX `rubber_deliveries_batch_id_idx`(`batch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `delivery_id` INTEGER NOT NULL,
    `member_id` INTEGER NOT NULL,
    `gross_amount` DECIMAL(12, 2) NOT NULL,
    `loan_deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `net_amount` DECIMAL(12, 2) NOT NULL,
    `date_issued` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `receipts_delivery_id_key`(`delivery_id`),
    INDEX `receipts_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `member_id` INTEGER NOT NULL,
    `principal_amount` DECIMAL(12, 2) NOT NULL,
    `interest_rate` DECIMAL(5, 2) NOT NULL,
    `remaining_balance` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `date_issued` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loans_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_id` INTEGER NOT NULL,
    `delivery_id` INTEGER NULL,
    `amount_deducted` DECIMAL(12, 2) NOT NULL,
    `payment_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loan_payments_loan_id_idx`(`loan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settlements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `member_id` INTEGER NOT NULL,
    `fiscal_year` INTEGER NOT NULL,
    `period_start` DATETIME(3) NULL,
    `period_end` DATETIME(3) NULL,
    `dividend` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `patronage_refund` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `date_paid` DATETIME(3) NULL,

    INDEX `settlements_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_scores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `member_id` INTEGER NOT NULL,
    `score` DECIMAL(6, 2) NOT NULL,
    `factors` JSON NULL,
    `computed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_scores_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `sender_user_id` INTEGER NULL,
    `recipient_role` ENUM('ADMIN', 'STAFF', 'MEMBER', 'MAO') NULL,
    `recipient_member_id` INTEGER NULL,
    `date_sent` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('UNREAD', 'READ') NOT NULL DEFAULT 'UNREAD',

    INDEX `notifications_recipient_role_idx`(`recipient_role`),
    INDEX `notifications_recipient_member_id_idx`(`recipient_member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` TEXT NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `target_barangay_id` INTEGER NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `status` ENUM('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `budget` DECIMAL(14, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_program_recipients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `program_id` INTEGER NOT NULL,
    `member_id` INTEGER NOT NULL,
    `quantity_or_amount` DECIMAL(12, 2) NULL,
    `date_distributed` DATETIME(3) NULL,

    INDEX `support_program_recipients_program_id_idx`(`program_id`),
    INDEX `support_program_recipients_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affected_area_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `barangay_id` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `severity` ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MODERATE',
    `note` TEXT NULL,
    `tagged_by_user_id` INTEGER NULL,
    `date_tagged` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,

    INDEX `affected_area_tags_barangay_id_idx`(`barangay_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `members` ADD CONSTRAINT `members_barangay_id_fkey` FOREIGN KEY (`barangay_id`) REFERENCES `barangays`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loading_batches` ADD CONSTRAINT `loading_batches_barangay_id_fkey` FOREIGN KEY (`barangay_id`) REFERENCES `barangays`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rubber_deliveries` ADD CONSTRAINT `rubber_deliveries_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rubber_deliveries` ADD CONSTRAINT `rubber_deliveries_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `loading_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `rubber_deliveries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_payments` ADD CONSTRAINT `loan_payments_loan_id_fkey` FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_payments` ADD CONSTRAINT `loan_payments_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `rubber_deliveries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settlements` ADD CONSTRAINT `settlements_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_scores` ADD CONSTRAINT `credit_scores_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_sender_user_id_fkey` FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_member_id_fkey` FOREIGN KEY (`recipient_member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_programs` ADD CONSTRAINT `support_programs_target_barangay_id_fkey` FOREIGN KEY (`target_barangay_id`) REFERENCES `barangays`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_program_recipients` ADD CONSTRAINT `support_program_recipients_program_id_fkey` FOREIGN KEY (`program_id`) REFERENCES `support_programs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_program_recipients` ADD CONSTRAINT `support_program_recipients_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affected_area_tags` ADD CONSTRAINT `affected_area_tags_barangay_id_fkey` FOREIGN KEY (`barangay_id`) REFERENCES `barangays`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affected_area_tags` ADD CONSTRAINT `affected_area_tags_tagged_by_user_id_fkey` FOREIGN KEY (`tagged_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
