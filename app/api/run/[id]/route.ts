import { NextRequest, NextResponse } from 'next/server';
import { activeRuns } from '@/lib/active-runs';
import { loadTestRun } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check active runs first
  const activeRun = activeRuns.get(id);
  if (activeRun) {
    return NextResponse.json({
      id,
      status: activeRun.status,
      progress: activeRun.progress,
      error: activeRun.error,
      summary: activeRun.run.summary,
    });
  }

  // Check stored runs
  const storedRun = loadTestRun(id);
  if (storedRun) {
    return NextResponse.json({
      id,
      status: 'complete',
      progress: {
        current: storedRun.summary.totalTests,
        total: storedRun.summary.totalTests,
        currentModel: '',
        currentScenario: 0,
        currentRun: 0,
      },
      summary: storedRun.summary,
    });
  }

  return NextResponse.json(
    {
      error: 'Run not found - it may have been lost due to server restart during development',
      id,
      status: 'lost',
    },
    { status: 404 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Cancel active run
  const activeRun = activeRuns.get(id);
  if (activeRun && activeRun.status === 'running') {
    activeRun.status = 'cancelled';
    return NextResponse.json({ success: true, message: 'Run cancelled' });
  }

  return NextResponse.json(
    { error: 'Run not found or not running' },
    { status: 404 }
  );
}
