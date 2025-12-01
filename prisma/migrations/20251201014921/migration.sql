/*
  Warnings:

  - You are about to drop the column `completedAt` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `dueAt` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `isTask` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `remindAt` on the `Note` table. All the data in the column will be lost.
  - The primary key for the `NoteTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `NoteTag` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[scope,name,ownerId]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scope,color,ownerId]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Note_ownerId_dueAt_idx";

-- DropIndex
DROP INDEX "NoteTag_noteId_tagId_key";

-- DropIndex
DROP INDEX "Tag_scope_name_key";

-- DropIndex
DROP INDEX "Tag_scope_ownerId_color_key";

-- DropIndex
DROP INDEX "Tag_scope_ownerId_name_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "completedAt",
DROP COLUMN "dueAt",
DROP COLUMN "isTask",
DROP COLUMN "priority",
DROP COLUMN "remindAt";

-- AlterTable
ALTER TABLE "NoteTag" DROP CONSTRAINT "NoteTag_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "NoteTag_pkey" PRIMARY KEY ("noteId", "tagId");

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "deletedAt",
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "displayName",
DROP COLUMN "email",
DROP COLUMN "updatedAt";

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "priority" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_noteId_key" ON "Task"("noteId");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- CreateIndex
CREATE INDEX "Task_completedAt_idx" ON "Task"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_scope_name_ownerId_key" ON "Tag"("scope", "name", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_scope_color_ownerId_key" ON "Tag"("scope", "color", "ownerId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
