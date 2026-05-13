-- CreateTable
CREATE TABLE "GroupTeacher" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupTeacher_pkey" PRIMARY KEY ("id")
);

-- Backfill existing Group.teacherId links
INSERT INTO "GroupTeacher" ("id", "groupId", "teacherId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), "id", "teacherId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Group"
WHERE "teacherId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GroupTeacher_groupId_teacherId_key" ON "GroupTeacher"("groupId", "teacherId");

-- CreateIndex
CREATE INDEX "GroupTeacher_teacherId_idx" ON "GroupTeacher"("teacherId");

-- CreateIndex
CREATE INDEX "GroupTeacher_groupId_idx" ON "GroupTeacher"("groupId");

-- Refresh Group indexes
DROP INDEX IF EXISTS "Group_branchId_courseId_teacherId_idx";
CREATE INDEX IF NOT EXISTS "Group_branchId_courseId_idx" ON "Group"("branchId", "courseId");

-- Drop old foreign key and column
ALTER TABLE "Group" DROP CONSTRAINT IF EXISTS "Group_teacherId_fkey";
ALTER TABLE "Group" DROP COLUMN IF EXISTS "teacherId";

-- AddForeignKey
ALTER TABLE "GroupTeacher" ADD CONSTRAINT "GroupTeacher_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeacher" ADD CONSTRAINT "GroupTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;