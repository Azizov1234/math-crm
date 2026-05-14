import { PrismaClient, Status } from '@prisma/client';

const prisma = new PrismaClient();

function buildUniqueName(originalName: string, usedNames: Set<string>): string {
  const base = originalName.trim() || 'Untitled';
  if (!usedNames.has(base)) {
    return base;
  }

  let counter = 2;
  let candidate = `${base} (${counter})`;
  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})`;
  }

  return candidate;
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const branches = await tx.branch.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const branchesBefore = branches.length;
    const activeBranchesBefore = branches.filter((branch) => branch.deletedAt === null && branch.status === Status.ACTIVE).length;

    let defaultBranch = branches[0];
    if (!defaultBranch) {
      defaultBranch = await tx.branch.create({
        data: {
          name: 'Main Academy',
          status: Status.ACTIVE,
        },
      });
    }

    if (defaultBranch.deletedAt !== null || defaultBranch.status !== Status.ACTIVE) {
      defaultBranch = await tx.branch.update({
        where: { id: defaultBranch.id },
        data: {
          status: Status.ACTIVE,
          deletedAt: null,
        },
      });
    }

    const otherBranchIds = branches
      .slice(1)
      .map((branch) => branch.id)
      .filter((branchId) => branchId !== defaultBranch.id);

    let updatedUsersCount = 0;
    let updatedStudentsCount = 0;
    let updatedTeachersCount = 0;
    let updatedCoursesCount = 0;
    let updatedGroupsCount = 0;
    let updatedStudentBillingsCount = 0;
    let updatedPaymentsCount = 0;
    let updatedMonthlyExamsCount = 0;
    let removedOrDeletedBranchesCount = 0;
    let renamedCoursesCount = 0;
    let renamedGroupsCount = 0;

    if (otherBranchIds.length > 0) {
      const moveCoursesResult = await (async () => {
        const existingNames = await tx.course.findMany({
          where: { branchId: defaultBranch.id },
          select: { name: true },
        });
        const usedNames = new Set(existingNames.map((item) => item.name));

        const coursesToMove = await tx.course.findMany({
          where: { branchId: { in: otherBranchIds } },
          select: { id: true, name: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        let updatedCount = 0;
        let renamedCount = 0;

        for (const course of coursesToMove) {
          const nextName = buildUniqueName(course.name, usedNames);
          if (nextName !== course.name) {
            renamedCount += 1;
          }
          usedNames.add(nextName);

          await tx.course.update({
            where: { id: course.id },
            data: {
              branchId: defaultBranch.id,
              ...(nextName !== course.name ? { name: nextName } : {}),
            },
          });

          updatedCount += 1;
        }

        return { updatedCount, renamedCount };
      })();

      const moveGroupsResult = await (async () => {
        const existingNames = await tx.group.findMany({
          where: { branchId: defaultBranch.id },
          select: { name: true },
        });
        const usedNames = new Set(existingNames.map((item) => item.name));

        const groupsToMove = await tx.group.findMany({
          where: { branchId: { in: otherBranchIds } },
          select: { id: true, name: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        let updatedCount = 0;
        let renamedCount = 0;

        for (const group of groupsToMove) {
          const nextName = buildUniqueName(group.name, usedNames);
          if (nextName !== group.name) {
            renamedCount += 1;
          }
          usedNames.add(nextName);

          await tx.group.update({
            where: { id: group.id },
            data: {
              branchId: defaultBranch.id,
              ...(nextName !== group.name ? { name: nextName } : {}),
            },
          });

          updatedCount += 1;
        }

        return { updatedCount, renamedCount };
      })();

      updatedCoursesCount = moveCoursesResult.updatedCount;
      renamedCoursesCount = moveCoursesResult.renamedCount;

      updatedGroupsCount = moveGroupsResult.updatedCount;
      renamedGroupsCount = moveGroupsResult.renamedCount;

      const [
        updatedUsers,
        updatedStudents,
        updatedTeachers,
        updatedStudentBillings,
        updatedPayments,
        updatedMonthlyExams,
        removedBranches,
      ] = await Promise.all([
        tx.user.updateMany({
          where: { branchId: { in: otherBranchIds } },
          data: { branchId: defaultBranch.id },
        }),
        tx.student.updateMany({
          where: { branchId: { in: otherBranchIds } },
          data: { branchId: defaultBranch.id },
        }),
        tx.teacher.updateMany({
          where: { branchId: { in: otherBranchIds } },
          data: { branchId: defaultBranch.id },
        }),
        tx.studentBilling.updateMany({
          where: { branchId: { in: otherBranchIds } },
          data: { branchId: defaultBranch.id },
        }),
        tx.payment.updateMany({
          where: { branchId: { in: otherBranchIds } },
          data: { branchId: defaultBranch.id },
        }),
        tx.monthlyExam.updateMany({
          where: { branchId: { in: otherBranchIds } },
          data: { branchId: defaultBranch.id },
        }),
        tx.branch.updateMany({
          where: { id: { in: otherBranchIds } },
          data: {
            status: Status.DELETED,
            deletedAt: now,
          },
        }),
      ]);

      updatedUsersCount = updatedUsers.count;
      updatedStudentsCount = updatedStudents.count;
      updatedTeachersCount = updatedTeachers.count;
      updatedStudentBillingsCount = updatedStudentBillings.count;
      updatedPaymentsCount = updatedPayments.count;
      updatedMonthlyExamsCount = updatedMonthlyExams.count;
      removedOrDeletedBranchesCount = removedBranches.count;
    }

    const branchesAfter = await tx.branch.count();
    const activeBranchesAfter = await tx.branch.count({
      where: {
        deletedAt: null,
        status: Status.ACTIVE,
      },
    });

    return {
      defaultBranchId: defaultBranch.id,
      branchesBefore,
      branchesAfter,
      activeBranchesBefore,
      activeBranchesAfter,
      updatedUsersCount,
      updatedStudentsCount,
      updatedTeachersCount,
      updatedCoursesCount,
      updatedGroupsCount,
      updatedStudentBillingsCount,
      updatedPaymentsCount,
      updatedMonthlyExamsCount,
      removedOrDeletedBranchesCount,
      renamedCoursesCount,
      renamedGroupsCount,
    };
  });

  console.log('Branches merged successfully:');
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error('Failed to merge branches:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
