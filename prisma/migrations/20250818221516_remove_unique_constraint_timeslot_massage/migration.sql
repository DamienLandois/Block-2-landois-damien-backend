-- DropForeignKey
ALTER TABLE `Booking` DROP FOREIGN KEY `Booking_timeSlotId_fkey`;

-- DropIndex
DROP INDEX `Booking_timeSlotId_massageId_key` ON `Booking`;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_timeSlotId_fkey` FOREIGN KEY (`timeSlotId`) REFERENCES `TimeSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
