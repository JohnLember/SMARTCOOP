-- Manual loan payments: staff record what a member paid at the office against
-- the amortization schedule. The automatic delivery deduction is removed, so
-- `amount_deducted` keeps its column name but the Prisma field is now `amount`.
-- Existing rows are legacy delivery deductions: payment_no stays NULL for them.

-- AlterTable
ALTER TABLE `loan_payments`
    ADD COLUMN `payment_no` VARCHAR(191) NULL,
    ADD COLUMN `schedule_id` INTEGER NULL,
    ADD COLUMN `allocations` JSON NULL,
    ADD COLUMN `reference_no` VARCHAR(191) NULL,
    ADD COLUMN `remarks` TEXT NULL,
    ADD COLUMN `recorded_by_user_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `loan_payments_payment_no_key` ON `loan_payments`(`payment_no`);

-- AddForeignKey
ALTER TABLE `loan_payments` ADD CONSTRAINT `loan_payments_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `loan_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_payments` ADD CONSTRAINT `loan_payments_recorded_by_user_id_fkey` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
