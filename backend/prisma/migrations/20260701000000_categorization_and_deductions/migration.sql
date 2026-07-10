-- Dynamic Member Categorization: replace old priority-scoring columns with
-- Activity Score / category fields (dropped columns held only derived data).
ALTER TABLE `members`
  DROP COLUMN `priority_score`,
  DROP COLUMN `rank_up_eligible`,
  DROP COLUMN `last_evaluated_at`,
  ADD COLUMN `delivery_score` INTEGER NULL,
  ADD COLUMN `loan_score` INTEGER NULL,
  ADD COLUMN `activity_score` INTEGER NULL,
  ADD COLUMN `repayment_rate` DECIMAL(6,2) NULL,
  ADD COLUMN `activity_category` ENUM('ACTIVE','MODERATE','INACTIVE','NOT_APPLICABLE') NULL,
  ADD COLUMN `last_categorized_at` DATETIME(3) NULL;

-- Delivery net-income deductions on the receipt.
ALTER TABLE `receipts`
  ADD COLUMN `cbu` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `membership_fee` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `supplies` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `dayong` DECIMAL(12,2) NOT NULL DEFAULT 0;
