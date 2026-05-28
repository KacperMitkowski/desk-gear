/*
  Warnings:

  - Added the required column `password_hash` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
