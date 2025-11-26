import { NextRequest, NextResponse } from 'next/server';
import {
  createTestRun,
  saveTestRun,
  updateRunSummary,
} from '@/lib/storage';
import { runFullTestSuite, type TestProgress } from '@/lib/test-runner';
import { models } from '@/lib/models';
import {
  activeRuns,
  type AttemptStatus,
  type RunAttempts,
} from '@/lib/active-runs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      models: modelIds = models.map(m => m.id),
      scenarios = [1, 2, 3, 4],
      runsPerScenario = 10,
      temperature = 0.1,
      maxRetries = 3,
    } = body;

    // Validate model IDs
    const validModelIds = modelIds.filter((id: string) =>
      models.some(m => m.id === id)
    );

    if (validModelIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid models specified' },
        { status: 400 }
      );
    }

    // Validate scenarios
    const validScenarios = scenarios.filter(
      (s: number) => s >= 1 && s <= 4
    );

    if (validScenarios.length === 0) {
      return NextResponse.json(
        { error: 'No valid scenarios specified' },
        { status: 400 }
      );
    }

    // Create test run
    const run = createTestRun({
      models: validModelIds,
      scenarios: validScenarios,
      runsPerScenario,
      temperature,
      maxRetries,
    });

    const totalTests = validModelIds.length * validScenarios.length * runsPerScenario;
    const maxAttempts = maxRetries + 1;

    // Initialize runs array with pending attempts
    const initialRuns: RunAttempts[] = Array.from({ length: runsPerScenario }, (_, i) => ({
      run: i + 1,
      attempts: Array(maxAttempts).fill('pending') as AttemptStatus[],
      final: 'pending' as const,
    }));

    // Initialize active run tracking
    activeRuns.set(run.id, {
      status: 'running',
      progress: {
        currentModel: validModelIds[0],
        currentScenario: validScenarios[0],
        currentRun: 1,
        currentAttempt: 1,
        runs: initialRuns,
        totalRuns: totalTests,
        completedRuns: 0,
        maxAttempts,
        logEntries: [],
      },
      run,
    });

    // Start tests in background
    runTestsInBackground(run.id, validModelIds, validScenarios, {
      temperature,
      maxTokens: 1500,
      maxRetries,
      runsPerScenario,
    });

    return NextResponse.json({ runId: run.id });
  } catch (error) {
    console.error('Error starting test run:', error);
    return NextResponse.json(
      { error: 'Failed to start test run' },
      { status: 500 }
    );
  }
}

async function runTestsInBackground(
  runId: string,
  modelIds: string[],
  scenarios: number[],
  config: { temperature: number; maxTokens: number; maxRetries: number; runsPerScenario: number }
) {
  const activeRun = activeRuns.get(runId);
  if (!activeRun) return;

  const startTime = Date.now();
  const maxAttempts = config.maxRetries + 1;
  const runsPerScenario = activeRun.run.config.runsPerScenario;

  let lastModel = '';
  let lastScenario = 0;

  const onProgress = (progress: TestProgress) => {
    const activeRun = activeRuns.get(runId);
    if (!activeRun) return;

    // Detect model+scenario change and reset runs array
    const modelOrScenarioChanged =
      progress.modelId !== lastModel || progress.scenario !== lastScenario;

    if (modelOrScenarioChanged) {
      lastModel = progress.modelId;
      lastScenario = progress.scenario;

      // Reset runs array for new model+scenario
      activeRun.progress.runs = Array.from({ length: runsPerScenario }, (_, i) => ({
        run: i + 1,
        attempts: Array(maxAttempts).fill('pending') as AttemptStatus[],
        final: 'pending' as const,
      }));
      // Clear log entries for new model+scenario
      activeRun.progress.logEntries = [];
    }

    const runIndex = progress.runNumber - 1;
    const attemptIndex = progress.attemptNumber - 1;

    // Update current position
    activeRun.progress.currentModel = progress.modelId;
    activeRun.progress.currentScenario = progress.scenario;
    activeRun.progress.currentRun = progress.runNumber;
    activeRun.progress.currentAttempt = progress.attemptNumber;

    // Add log entry if present (keep last 50 entries to limit memory)
    if (progress.logEntry) {
      activeRun.progress.logEntries.push(progress.logEntry);
      if (activeRun.progress.logEntries.length > 50) {
        activeRun.progress.logEntries = activeRun.progress.logEntries.slice(-50);
      }
    }

    // Update attempt status
    if (runIndex >= 0 && runIndex < activeRun.progress.runs.length) {
      const runData = activeRun.progress.runs[runIndex];

      if (progress.status === 'running') {
        runData.attempts[attemptIndex] = 'running';
      } else if (progress.status === 'retrying') {
        // Mark previous attempt as failed, current as running
        if (attemptIndex > 0) {
          runData.attempts[attemptIndex - 1] = 'failed';
        }
        runData.attempts[attemptIndex] = 'running';
      } else if (progress.status === 'success') {
        runData.attempts[attemptIndex] = 'success';
        // Mark remaining attempts as skipped
        for (let i = attemptIndex + 1; i < maxAttempts; i++) {
          runData.attempts[i] = 'skipped';
        }
        runData.final = 'success';
        activeRun.progress.completedRuns++;
      } else if (progress.status === 'failed') {
        runData.attempts[attemptIndex] = 'failed';
        // If this was the last attempt, mark run as failed
        if (attemptIndex === maxAttempts - 1) {
          runData.final = 'failed';
          activeRun.progress.completedRuns++;
        }
      }
    }
  };

  try {
    const results = await runFullTestSuite(
      modelIds,
      scenarios,
      config,
      onProgress
    );

    // Update run with results
    activeRun.run.results = results;
    activeRun.run.duration = Date.now() - startTime;
    updateRunSummary(activeRun.run);

    // Save to storage
    saveTestRun(activeRun.run);

    activeRun.status = 'complete';

    // Clean up after 60 seconds to allow polling to see completion
    setTimeout(() => {
      activeRuns.delete(runId);
    }, 60000);
  } catch (error) {
    console.error('Error running tests:', error);
    activeRun.status = 'error';
    activeRun.error = error instanceof Error ? error.message : String(error);

    // Clean up errors after 60 seconds too
    setTimeout(() => {
      activeRuns.delete(runId);
    }, 60000);
  }
}

export async function GET() {
  // List active runs
  const runs = Array.from(activeRuns.entries()).map(([id, data]) => ({
    id,
    status: data.status,
    progress: data.progress,
  }));

  return NextResponse.json({ runs });
}
