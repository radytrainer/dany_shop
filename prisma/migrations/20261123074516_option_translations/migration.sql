-- AlterTable
ALTER TABLE "Color" ADD COLUMN     "translations" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Size" ADD COLUMN     "translations" JSONB NOT NULL DEFAULT '{}';
