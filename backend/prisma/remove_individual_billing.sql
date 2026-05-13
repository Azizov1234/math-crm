-- AlterEnum: Remove INDIVIDUAL from BillingType
BEGIN;
CREATE TYPE "BillingType_new" AS ENUM ('DEFAULT', 'DISCOUNTED', 'FREE');
ALTER TABLE "public"."StudentBilling" ALTER COLUMN "billingType" DROP DEFAULT;
ALTER TABLE "StudentBilling" ALTER COLUMN "billingType" TYPE "BillingType_new" USING ("billingType"::text::"BillingType_new");
ALTER TYPE "BillingType" RENAME TO "BillingType_old";
ALTER TYPE "BillingType_new" RENAME TO "BillingType";
DROP TYPE "public"."BillingType_old";
ALTER TABLE "StudentBilling" ALTER COLUMN "billingType" SET DEFAULT 'DEFAULT';
COMMIT;
