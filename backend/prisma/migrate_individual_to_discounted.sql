-- Step 1: Update all INDIVIDUAL to DISCOUNTED before removing the enum value
UPDATE "StudentBilling" SET "billingType" = 'DISCOUNTED' WHERE "billingType" = 'INDIVIDUAL';

-- Step 2: Check remaining count
SELECT COUNT(*) as remaining_individual FROM "StudentBilling" WHERE "billingType" = 'INDIVIDUAL';
