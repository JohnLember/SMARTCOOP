-- AddColumn (nullable first, to backfill existing rows)
ALTER TABLE `membership_applications` ADD COLUMN `application_no` VARCHAR(191) NULL;

-- Backfill existing rows with a stable APP-0001-style number derived from id order
SET @rownum := 0;
UPDATE `membership_applications`
SET `application_no` = CONCAT('APP-', LPAD((@rownum := @rownum + 1), 4, '0'))
ORDER BY `id` ASC;

-- Enforce NOT NULL + uniqueness now that every row has a value
ALTER TABLE `membership_applications` MODIFY COLUMN `application_no` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `membership_applications_application_no_key` ON `membership_applications`(`application_no`);
