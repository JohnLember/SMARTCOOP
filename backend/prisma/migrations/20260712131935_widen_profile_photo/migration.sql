-- Widen profile_photo to hold a base64 data-URL image (was VARCHAR(191)).
ALTER TABLE `members` MODIFY COLUMN `profile_photo` MEDIUMTEXT NULL;
