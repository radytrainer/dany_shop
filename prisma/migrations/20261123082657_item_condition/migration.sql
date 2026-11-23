-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW_WITH_TAGS', 'LIKE_NEW', 'EXCELLENT', 'GOOD', 'FAIR');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "condition" "ItemCondition";
