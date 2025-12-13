ALTER TABLE `users`
  ADD COLUMN `email_verified_at` DATETIME(3) NULL,
  ADD COLUMN `verification_token` VARCHAR(255) NULL,
  ADD COLUMN `verification_expires_at` DATETIME(3) NULL;
