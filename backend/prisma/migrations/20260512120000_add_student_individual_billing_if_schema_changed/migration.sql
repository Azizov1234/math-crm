-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('DEFAULT', 'INDIVIDUAL', 'DISCOUNTED', 'FREE');

-- AlterTable
ALTER TABLE "StudentBilling" ADD COLUMN     "billingType" "BillingType" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "note" TEXT;
