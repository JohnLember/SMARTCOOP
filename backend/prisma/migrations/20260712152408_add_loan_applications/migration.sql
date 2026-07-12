-- CreateTable
CREATE TABLE `loan_applications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `application_no` VARCHAR(191) NOT NULL,
    `member_id` INTEGER NOT NULL,
    `principal_amount` DECIMAL(12, 2) NOT NULL,
    `term_months` INTEGER NOT NULL,
    `interest_rate` DECIMAL(5, 2) NOT NULL,
    `purpose` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `review_note` TEXT NULL,
    `reviewed_by_user_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `loan_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loan_applications_application_no_key`(`application_no`),
    INDEX `loan_applications_status_idx`(`status`),
    INDEX `loan_applications_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
