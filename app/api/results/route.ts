import { NextRequest, NextResponse } from 'next/server';
import { listRecentRuns, getAllRuns } from '@/lib/storage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const format = searchParams.get('format');

  if (format === 'csv') {
    // Export as CSV
    const runs = getAllRuns();
    const rows: string[] = [
      'timestamp,model_id,provider,scenario,run,attempt,success,duration_ms,input_tokens,output_tokens',
    ];

    for (const run of runs) {
      for (const [modelId, modelResults] of Object.entries(run.results)) {
        for (const [scenario, scenarioResult] of Object.entries(modelResults)) {
          for (const runResult of scenarioResult.runs) {
            for (const attempt of runResult.attempts) {
              rows.push([
                run.timestamp,
                modelId,
                modelId.split('-')[0], // Extract provider from modelId
                scenario,
                runResult.runNumber,
                attempt.attemptNumber,
                attempt.success,
                attempt.durationMs,
                attempt.inputTokens || 0,
                attempt.outputTokens || 0,
              ].join(','));
            }
          }
        }
      }
    }

    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="results.csv"',
      },
    });
  }

  if (format === 'json') {
    // Export all as JSON
    const runs = getAllRuns();
    return new NextResponse(JSON.stringify(runs, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="results.json"',
      },
    });
  }

  // Default: list recent runs
  const runs = listRecentRuns(limit);
  return NextResponse.json({ runs, total: runs.length });
}
