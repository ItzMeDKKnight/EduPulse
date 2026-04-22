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

export async function generatePerformanceReport(studentData: StudentPerformanceData): Promise<string> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;

  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    return generateMockReport(studentData);
  }

  try {
    const attendancePercent = studentData.attendance.total > 0
      ? Math.round((studentData.attendance.present / studentData.attendance.total) * 100)
      : 0;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are an expert educational psychologist and academic performance analyst. 
Analyze the student's academic data and provide a detailed, actionable performance report. 
Be specific, empathetic, and constructive. Format your response in clear sections using markdown.
Always provide: Overall Assessment, Subject Analysis, Attendance Impact, Risk Level (Low/Medium/High), 
and 5 specific actionable recommendations. Keep tone encouraging but honest.`,
        messages: [
          {
            role: 'user',
            content: `Please analyze this student's academic performance data and generate a comprehensive report:

Student: ${studentData.name}

ATTENDANCE:
- Present: ${studentData.attendance.present}/${studentData.attendance.total} days (${attendancePercent}%)
- Absent: ${studentData.attendance.absent} days
- Late: ${studentData.attendance.late} days

MARKS/GRADES:
${studentData.marks.map((m) => `- ${m.subject} (${m.exam_type}): ${m.marks_obtained}/${m.max_marks} (${Math.round((m.marks_obtained / m.max_marks) * 100)}%) on ${m.date}`).join('\n')}

ASSIGNMENTS:
- Submitted: ${studentData.assignments.submitted}/${studentData.assignments.total}
- Average marks on graded: ${studentData.assignments.avg_marks}%

QUIZZES:
- Attempted: ${studentData.quizzes.attempted}/${studentData.quizzes.total}
- Average quiz score: ${studentData.quizzes.avg_score_percent}%

Generate a detailed performance analysis report.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error);
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
