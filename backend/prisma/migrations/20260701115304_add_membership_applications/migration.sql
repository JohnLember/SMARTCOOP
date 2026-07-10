-- CreateTable
CREATE TABLE `membership_applications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(191) NOT NULL,
    `middle_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `sex` VARCHAR(191) NULL,
    `birthdate` DATETIME(3) NULL,
    `address` VARCHAR(191) NULL,
    `barangay_id` INTEGER NULL,
    `contact_no` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `membership_type` ENUM('REGULAR', 'ASSOCIATE') NOT NULL DEFAULT 'ASSOCIATE',
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `review_note` TEXT NULL,
    `reviewed_by_user_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `member_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `membership_applications_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `membership_applications` ADD CONSTRAINT `membership_applications_barangay_id_fkey` FOREIGN KEY (`barangay_id`) REFERENCES `barangays`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
