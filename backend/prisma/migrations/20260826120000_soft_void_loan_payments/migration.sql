-- Soft void: cancelling a loan payment no longer deletes the row. The schedule
-- allocation is still reversed, but the record survives so a member holding the
-- printed LP- slip can still find it, marked VOIDED.
-- Existing rows are live payments: voided_at stays NULL for all of them.

-- AlterTable
ALTER TABLE `loan_payments`
    ADD COLUMN `voided_at` DATETIME(3) NULL,
    ADD COLUMN `voided_by_user_id` INTEGER NULL,
    ADD COLUMN `void_reason` TEXT NULL;
