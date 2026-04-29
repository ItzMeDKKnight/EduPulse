export interface StudentPerformanceData {
  name: string;
  attendance: { present: number; absent: number; late: number; total: number };
  marks: Array<{
    subject: string;
    exam_type: string;
    marks_obtained: number;
    max_marks: number;
    date: string;
  }>;
  assignments: { total: number; submitted: number; graded: number; avg_marks: number };
  quizzes: { total: number; attempted: number; avg_score_percent: number };
}

import supabase from './supabase';

export async function generatePerformanceReport(studentData: StudentPerformanceData): Promise<string> {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-report', {
      body: { studentData }
    });

    if (error) {
      console.warn('Edge Function error, falling back to mock:', error);
      return generateMockReport(studentData);
    }

    if (data?.error) {
      console.warn('AI Generation error, falling back to mock:', data.error);
      return generateMockReport(studentData);
    }

    return data.report;
  } catch (error) {
    console.error('Failed to call Edge Function:', error);
    return generateMockReport(studentData);
  }
}

function generateMockReport(data: StudentPerformanceData): string {
  const attendancePercent = data.attendance.total > 0
    ? Math.round((data.attendance.present / data.attendance.total) * 100)
    : 0;

  const avgMarks = data.marks.length > 0
    ? Math.round(data.marks.reduce((sum, m) => sum + (m.marks_obtained / m.max_marks) * 100, 0) / data.marks.length)
    : 0;

  let riskLevel = 'Low';
  let riskColor = '🟢';
  if (avgMarks < 50 || attendancePercent < 70) {
    riskLevel = 'High';
    riskColor = '🔴';
  } else if (avgMarks < 70 || attendancePercent < 85) {
    riskLevel = 'Medium';
    riskColor = '🟡';
  }

  return `## 📊 Overall Performance Summary

**Student:** ${data.name}
**Risk Level:** ${riskColor} ${riskLevel}

${data.name} has maintained an overall academic average of **${avgMarks}%** across all subjects with an attendance rate of **${attendancePercent}%**.

## 📚 Subject Analysis

${data.marks.length > 0 ? data.marks.map((m) => {
    const pct = Math.round((m.marks_obtained / m.max_marks) * 100);
    const emoji = pct >= 80 ? '🌟' : pct >= 60 ? '📗' : '⚠️';
    return `- ${emoji} **${m.subject}** (${m.exam_type}): ${m.marks_obtained}/${m.max_marks} (${pct}%)`;
  }).join('\n') : '- No marks data available yet.'}

## 📅 Attendance Impact

- Attendance Rate: **${attendancePercent}%** (${data.attendance.present}/${data.attendance.total} days)
- Days Absent: ${data.attendance.absent} | Days Late: ${data.attendance.late}
${attendancePercent < 85 ? '\n⚠️ **Attendance is below the recommended 85% threshold.** This may be impacting academic performance.' : '\n✅ Attendance is within a healthy range.'}

## 📝 Assignments & Quizzes

- Assignments Submitted: ${data.assignments.submitted}/${data.assignments.total} (Avg: ${data.assignments.avg_marks}%)
- Quizzes Attempted: ${data.quizzes.attempted}/${data.quizzes.total} (Avg Score: ${data.quizzes.avg_score_percent}%)

## 💡 Actionable Recommendations

1. ${avgMarks < 70 ? 'Focus on improving weaker subjects through additional practice and tutoring sessions.' : 'Continue maintaining strong performance across subjects.'}
2. ${attendancePercent < 85 ? 'Improve attendance to at least 85% to maximize learning opportunities.' : 'Maintain current attendance levels.'}
3. ${data.assignments.submitted < data.assignments.total ? 'Ensure all assignments are submitted on time to avoid penalties.' : 'Keep up the excellent assignment submission record.'}
4. ${data.quizzes.avg_score_percent < 70 ? 'Review quiz topics more thoroughly before attempting quizzes.' : 'Continue strong quiz preparation.'}
5. Set specific weekly study goals and use a study planner to track progress consistently.`;
}
