import { Branch, PrismaClient, Status } from '@prisma/client';

type BranchClient = Pick<PrismaClient, 'branch'>;

export async function getDefaultBranch(prisma: BranchClient): Promise<Branch> {
  const firstActiveBranch = await prisma.branch.findFirst({
    where: {
      deletedAt: null,
      status: Status.ACTIVE,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (firstActiveBranch) {
    return firstActiveBranch;
  }

  const firstBranch = await prisma.branch.findFirst({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (firstBranch) {
    return prisma.branch.update({
      where: { id: firstBranch.id },
      data: {
        status: Status.ACTIVE,
        deletedAt: null,
      },
    });
  }

  return prisma.branch.create({
    data: {
      name: 'Main Academy',
      status: Status.ACTIVE,
    },
  });
}
