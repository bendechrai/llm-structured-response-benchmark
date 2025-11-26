import type { TestRunFile } from './storage';
import type { LogEntry } from './test-runner';

export type AttemptStatus = 'pending' | 'running' | 'failed' | 'success' | 'skipped';

export interface RunAttempts {
  run: number;
  attempts: AttemptStatus[];
  final: 'pending' | 'success' | 'failed';
}

export interface DetailedProgress {
  currentModel: string;
  currentScenario: number;
  currentRun: number;
  currentAttempt: number;
  runs: RunAttempts[];
  totalRuns: number;
  completedRuns: number;
  maxAttempts: number;
  logEntries: LogEntry[];
}

export interface ActiveRun {
  status: 'running' | 'complete' | 'cancelled' | 'error';
  progress: DetailedProgress;
  run: TestRunFile;
  error?: string;
}

// Singleton map stored in global to survive hot reloads in development
const globalForActiveRuns = globalThis as unknown as {
  activeRuns: Map<string, ActiveRun> | undefined;
};

export const activeRuns = globalForActiveRuns.activeRuns ?? new Map<string, ActiveRun>();

if (process.env.NODE_ENV !== 'production') {
  globalForActiveRuns.activeRuns = activeRuns;
}
