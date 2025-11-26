import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = join(process.cwd(), 'data');
const RESULTS_DIR = join(DATA_DIR, 'results');
const INDEX_PATH = join(DATA_DIR, 'index.json');

// Types
export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

export interface AttemptResult {
  attemptNumber: number;
  timestamp: string;
  success: boolean;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  prompt: string;
  rawResponse: string;
  parsedResponse: Record<string, unknown> | null;
  validationErrors: ValidationError[];
  errorMessage: string | null;
}

export interface RunResult {
  runNumber: number;
  success: boolean;
  attempts: AttemptResult[];
  totalDurationMs: number;
  finalResponse: Record<string, unknown> | null;
}

export interface ScenarioResult {
  runs: RunResult[];
  summary: {
    successRate: number;
    firstAttemptSuccessRate: number;
    afterRetry1SuccessRate: number;
    afterRetry2SuccessRate: number;
    afterRetry3SuccessRate: number;
    averageDurationMs: number;
    averageAttempts: number;
    totalTokensUsed: number;
  };
}

export interface TestRunConfig {
  models: string[];
  scenarios: number[];
  runsPerScenario: number;
  temperature: number;
  maxRetries: number;
}

export interface TestRunSummary {
  totalTests: number;
  passed: number;
  failed: number;
  successRate: number;
}

export interface TestRunFile {
  id: string;
  timestamp: string;
  duration: number;
  config: TestRunConfig;
  summary: TestRunSummary;
  results: {
    [modelId: string]: {
      [scenarioNumber: string]: ScenarioResult;
    };
  };
}

export interface IndexEntry {
  id: string;
  timestamp: string;
  filename: string;
  summary: {
    models: string[];
    totalTests: number;
    successRate: number;
  };
}

export interface IndexFile {
  runs: IndexEntry[];
}

// Ensure directories exist
function ensureDirectories(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

// Load index
export function loadIndex(): IndexFile {
  ensureDirectories();
  if (!existsSync(INDEX_PATH)) {
    return { runs: [] };
  }
  try {
    return JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
  } catch {
    return { runs: [] };
  }
}

// Save index
function saveIndex(index: IndexFile): void {
  ensureDirectories();
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

// Create a new test run
export function createTestRun(config: TestRunConfig): TestRunFile {
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  return {
    id,
    timestamp,
    duration: 0,
    config,
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      successRate: 0,
    },
    results: {},
  };
}

// Save a test run
export function saveTestRun(run: TestRunFile): void {
  ensureDirectories();

  // Save the run file
  const filename = `${run.timestamp.replace(/:/g, '-')}.json`;
  const filepath = join(RESULTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(run, null, 2));

  // Update index
  const index = loadIndex();
  
  // Remove existing entry if updating
  const existingIndex = index.runs.findIndex((r) => r.id === run.id);
  if (existingIndex >= 0) {
    index.runs.splice(existingIndex, 1);
  }

  // Add new entry at the beginning
  index.runs.unshift({
    id: run.id,
    timestamp: run.timestamp,
    filename,
    summary: {
      models: run.config.models,
      totalTests: run.summary.totalTests,
      successRate: run.summary.successRate,
    },
  });

  saveIndex(index);
}

// Load a test run by ID
export function loadTestRun(id: string): TestRunFile | null {
  const index = loadIndex();
  const entry = index.runs.find((r) => r.id === id);
  if (!entry) return null;

  const filepath = join(RESULTS_DIR, entry.filename);
  if (!existsSync(filepath)) return null;

  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

// List recent runs
export function listRecentRuns(limit: number = 10): IndexEntry[] {
  const index = loadIndex();
  return index.runs.slice(0, limit);
}

// Delete a test run
export function deleteTestRun(id: string): boolean {
  const index = loadIndex();
  const entryIndex = index.runs.findIndex((r) => r.id === id);
  if (entryIndex === -1) return false;

  const entry = index.runs[entryIndex];
  const filepath = join(RESULTS_DIR, entry.filename);

  // Delete the file
  if (existsSync(filepath)) {
    unlinkSync(filepath);
  }

  // Update index
  index.runs.splice(entryIndex, 1);
  saveIndex(index);

  return true;
}

// Get all runs for export
export function getAllRuns(): TestRunFile[] {
  const index = loadIndex();
  const runs: TestRunFile[] = [];

  for (const entry of index.runs) {
    const run = loadTestRun(entry.id);
    if (run) {
      runs.push(run);
    }
  }

  return runs;
}

// Calculate scenario summary from runs
export function calculateScenarioSummary(runs: RunResult[]): ScenarioResult['summary'] {
  const totalRuns = runs.length;
  if (totalRuns === 0) {
    return {
      successRate: 0,
      firstAttemptSuccessRate: 0,
      afterRetry1SuccessRate: 0,
      afterRetry2SuccessRate: 0,
      afterRetry3SuccessRate: 0,
      averageDurationMs: 0,
      averageAttempts: 0,
      totalTokensUsed: 0,
    };
  }

  const successfulRuns = runs.filter((r) => r.success).length;
  const firstAttemptSuccesses = runs.filter(
    (r) => r.attempts[0]?.success
  ).length;
  
  // Cumulative success after each retry
  let afterRetry1 = firstAttemptSuccesses;
  let afterRetry2 = firstAttemptSuccesses;
  let afterRetry3 = firstAttemptSuccesses;

  for (const run of runs) {
    if (run.attempts[0]?.success) continue; // Already counted
    if (run.attempts[1]?.success) {
      afterRetry1++;
      afterRetry2++;
      afterRetry3++;
    } else if (run.attempts[2]?.success) {
      afterRetry2++;
      afterRetry3++;
    } else if (run.attempts[3]?.success) {
      afterRetry3++;
    }
  }

  const totalDuration = runs.reduce((sum, r) => sum + r.totalDurationMs, 0);
  const totalAttempts = runs.reduce((sum, r) => sum + r.attempts.length, 0);
  const totalTokens = runs.reduce((sum, r) => {
    return sum + r.attempts.reduce((aSum, a) => {
      return aSum + (a.inputTokens || 0) + (a.outputTokens || 0);
    }, 0);
  }, 0);

  return {
    successRate: (successfulRuns / totalRuns) * 100,
    firstAttemptSuccessRate: (firstAttemptSuccesses / totalRuns) * 100,
    afterRetry1SuccessRate: (afterRetry1 / totalRuns) * 100,
    afterRetry2SuccessRate: (afterRetry2 / totalRuns) * 100,
    afterRetry3SuccessRate: (afterRetry3 / totalRuns) * 100,
    averageDurationMs: totalDuration / totalRuns,
    averageAttempts: totalAttempts / totalRuns,
    totalTokensUsed: totalTokens,
  };
}

// Update run summary
export function updateRunSummary(run: TestRunFile): void {
  let totalTests = 0;
  let passed = 0;

  for (const modelId of Object.keys(run.results)) {
    for (const scenario of Object.keys(run.results[modelId])) {
      const scenarioResult = run.results[modelId][scenario];
      totalTests += scenarioResult.runs.length;
      passed += scenarioResult.runs.filter((r) => r.success).length;
    }
  }

  run.summary = {
    totalTests,
    passed,
    failed: totalTests - passed,
    successRate: totalTests > 0 ? (passed / totalTests) * 100 : 0,
  };
}
