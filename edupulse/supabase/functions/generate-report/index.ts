import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { studentData } = await req.json()

    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY is not set')
    }

    const attendancePercent = studentData.attendance.total > 0
      ? Math.round((studentData.attendance.present / studentData.attendance.total) * 100)
      : 0;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
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
${studentData.marks.map((m: any) => `- ${m.subject} (${m.exam_type}): ${m.marks_obtained}/${m.max_marks} (${Math.round((m.marks_obtained / m.max_marks) * 100)}%) on ${m.date}`).join('\n')}

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

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return new Response(JSON.stringify({ report: data.content[0].text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
