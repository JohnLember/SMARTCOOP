-- DropForeignKey
ALTER TABLE `receipts` DROP FOREIGN KEY `receipts_delivery_id_fkey`;

-- AlterTable
ALTER TABLE `receipts` MODIFY `delivery_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `rubber_deliveries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
