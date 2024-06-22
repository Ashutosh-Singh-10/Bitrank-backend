/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ALTER COLUMN [password] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[User] ADD [googleId] NVARCHAR(1000);

-- CreateIndex
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_googleId_key] UNIQUE NONCLUSTERED ([googleId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
