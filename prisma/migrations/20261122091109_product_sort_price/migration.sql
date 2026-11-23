-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sortPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_sortPrice_idx" ON "Product"("sortPrice");

-- CreateIndex
CREATE INDEX "Product_viewCount_idx" ON "Product"("viewCount");

-- Backfill
UPDATE "Product" SET "sortPrice" = COALESCE("salePrice", "price");
