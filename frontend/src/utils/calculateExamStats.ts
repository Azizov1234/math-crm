import type { MonthlyExam } from '@/types';

export function calculateExamStats(exam: MonthlyExam) {
  const total = exam.totalStudents || 1;
  return {
    passedPct: Math.round((exam.passedCount / total) * 100),
    failedPct: Math.round((exam.failedCount / total) * 100),
    skippedPct: Math.round((exam.skippedCount / total) * 100),
    sentToRetakePct: Math.round((exam.sentToRetakeCount / total) * 100),
    total,
  };
}

export function calculateOverallExamStats(exams: MonthlyExam[]) {
  const finished = exams.filter(e => e.status === 'FINISHED');
  const totalResults = finished.reduce((s,e)=>s+e.totalStudents,0) || 1;
  const totalPassed = finished.reduce((s,e)=>s+e.passedCount,0);
  const totalFailed = finished.reduce((s,e)=>s+e.failedCount,0);
  const totalSkipped = finished.reduce((s,e)=>s+e.skippedCount,0);
  const totalRetake = finished.reduce((s,e)=>s+e.sentToRetakeCount,0);
  return {
    passedCount: totalPassed, passedPct: Math.round(totalPassed/totalResults*100),
    failedCount: totalFailed, failedPct: Math.round(totalFailed/totalResults*100),
    skippedCount: totalSkipped, skippedPct: Math.round(totalSkipped/totalResults*100),
    sentToRetakeCount: totalRetake, sentToRetakePct: Math.round(totalRetake/totalResults*100),
  };
}
