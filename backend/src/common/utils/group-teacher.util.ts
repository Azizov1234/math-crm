export const PRIMARY_GROUP_TEACHER_INCLUDE = {
  teachers: {
    where: {
      teacher: {
        deletedAt: null,
        status: { not: 'DELETED' },
      },
    },
    include: {
      teacher: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          subject: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

type GroupTeacherEntry = {
  teacher?: {
    id: string;
    fullName: string;
    phone?: string | null;
    subject?: string | null;
    status?: string;
  } | null;
};

type GroupWithTeacherEntries = {
  teachers?: GroupTeacherEntry[] | null;
};

export function getPrimaryTeacherFromGroup(group: GroupWithTeacherEntries) {
  return group.teachers?.[0]?.teacher ?? null;
}

export function withPrimaryTeacher<T extends GroupWithTeacherEntries>(group: T) {
  const teacher = getPrimaryTeacherFromGroup(group);
  const allTeachers = (group.teachers || []).map((t) => t.teacher).filter(Boolean);
  
  return {
    ...group,
    teacher,
    teacherId: teacher?.id ?? null,
    allTeachers,
    teacherIds: allTeachers.map((t) => t?.id),
  };
}
