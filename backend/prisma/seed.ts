import { PrismaClient, Status, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME ?? 'superadmin';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'superadmin123';
const SUPERADMIN_FULL_NAME = process.env.SUPERADMIN_FULL_NAME ?? 'Tizim Superadmini';
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'superadmin@academy.local';
const SUPERADMIN_PHONE = process.env.SUPERADMIN_PHONE ?? '+998900000001';
const DEFAULT_BRANCH_NAME = process.env.DEFAULT_BRANCH_NAME ?? "Asosiy O'quv Markaz";
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

async function getOrCreateDefaultBranch() {
  const existingBranch = await prisma.branch.findFirst({
    where: { deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (existingBranch) {
    if (existingBranch.status === Status.ACTIVE) {
      return existingBranch;
    }

    return prisma.branch.update({
      where: { id: existingBranch.id },
      data: {
        status: Status.ACTIVE,
        deletedAt: null,
      },
    });
  }

  return prisma.branch.create({
    data: {
      name: DEFAULT_BRANCH_NAME,
      status: Status.ACTIVE,
    },
  });
}

async function main() {
  const defaultBranch = await getOrCreateDefaultBranch();
  const superadminHash = await bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS);

  await prisma.user.upsert({
    where: { username: SUPERADMIN_USERNAME },
    update: {
      fullName: SUPERADMIN_FULL_NAME,
      email: SUPERADMIN_EMAIL,
      phone: SUPERADMIN_PHONE,
      password: superadminHash,
      role: UserRole.SUPERADMIN,
      status: Status.ACTIVE,
      branchId: defaultBranch.id,
      deletedAt: null,
    },
    create: {
      fullName: SUPERADMIN_FULL_NAME,
      username: SUPERADMIN_USERNAME,
      email: SUPERADMIN_EMAIL,
      phone: SUPERADMIN_PHONE,
      password: superadminHash,
      role: UserRole.SUPERADMIN,
      status: Status.ACTIVE,
      branchId: defaultBranch.id,
    },
  });

  console.log("Seed tugadi: faqat default branch va superadmin tayyorlandi.");
  console.log(`Default branch: ${defaultBranch.name} (${defaultBranch.id})`);
  console.log(`Login: ${SUPERADMIN_USERNAME} / ${SUPERADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
