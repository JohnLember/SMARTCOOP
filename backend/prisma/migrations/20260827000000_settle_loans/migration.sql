-- Settling a paid-off loan: staff close it deliberately once the whole schedule
-- is paid. From then on its payments cannot be voided and it drops out of the
-- working loans list into the Settled view. Reopening needs an admin password
-- and clears settled_at back to NULL.
--
-- Not a LoanStatus value: sync_loan_state rewrites `status` from the schedule
-- after every payment and void, which would wipe it. Existing rows are open.

-- AlterTable
ALTER TABLE `loans`
    ADD COLUMN `settled_at` DATETIME(3) NULL,
    ADD COLUMN `settled_by_user_id` INTEGER NULL;
