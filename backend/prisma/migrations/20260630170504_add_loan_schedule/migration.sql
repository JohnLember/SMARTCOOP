/*
  Warnings:

  - Added the required column `term_months` to the `loans` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `loans` ADD COLUMN `term_months` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `loan_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loan_id` INTEGER NOT NULL,
    `period_no` INTEGER NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `principal_due` DECIMAL(12, 2) NOT NULL,
    `interest_due` DECIMAL(12, 2) NOT NULL,
    `total_due` DECIMAL(12, 2) NOT NULL,
    `amount_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'PENDING',

    INDEX `loan_schedules_loan_id_idx`(`loan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `loan_schedules` ADD CONSTRAINT `loan_schedules_loan_id_fkey` FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
