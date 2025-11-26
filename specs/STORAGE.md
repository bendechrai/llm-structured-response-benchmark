# Data Storage Specification

## Overview

Test results are stored as JSON files in the local filesystem. This provides:
- Easy inspection and debugging
- No database setup required
- Simple backup (just copy the directory)
- Git-friendly (can optionally commit results)

---

## Directory Structure

```
data/
├── results/
│   ├── 2025-11-26T10-30-00-000Z.json    # Individual test runs
│   ├── 2025-11-26T14-45-00-000Z.json
│   └── ...
└── index.json                            # Index of all runs (for quick listing)
```

---

## File Formats

### Test Run File (`data/results/{timestamp}.json`)

```typescript
interface TestRunFile {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  duration: number;              // Total duration in ms
  config: {
    providers: string[];         // Provider IDs tested
    scenarios: number[];         // Scenario numbers tested
    runsPerScenario: number;     // Number of runs per scenario
  };
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
  };
  results: {
    [providerId: string]: {
      [scenarioNumber: string]: ScenarioResult;
    };
  };
}

interface ScenarioResult {
  runs: RunResult[];
  summary: {
    successRate: number;
    firstAttemptSuccessRate: number;
    afterRetry1SuccessRate: number;
    afterRetry2SuccessRate: number;
    afterRetry3SuccessRate: number;
    averageDurationMs: number;
    averageAttempts: number;
  };
}

interface RunResult {
  runNumber: number;
  success: boolean;
  attempts: AttemptResult[];
  totalDurationMs: number;
  finalResponse: object | null;
}

interface AttemptResult {
  attemptNumber: number;
  timestamp: string;
  success: boolean;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  rawResponse: string;
  parsedResponse: object | null;
  validationErrors: ValidationError[];
  errorMessage: string | null;
}

interface ValidationError {
  path: string[];
  message: string;
  code: string;
}
```

### Index File (`data/index.json`)

```typescript
interface IndexFile {
  runs: IndexEntry[];
}

interface IndexEntry {
  id: string;
  timestamp: string;
  filename: string;
  summary: {
    providers: string[];
    totalTests: number;
    successRate: number;
  };
}
```

---

## File Operations

### Creating a New Run

```typescript
import { randomUUID } from 'crypto';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const RESULTS_DIR = join(DATA_DIR, 'results');
const INDEX_PATH = join(DATA_DIR, 'index.json');

function ensureDirectories() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR);
}

function saveTestRun(run: TestRunFile): void {
  ensureDirectories();
  
  // Save the run file
  const filename = `${run.timestamp.replace(/:/g, '-')}.json`;
  const filepath = join(RESULTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(run, null, 2));
  
  // Update index
  const index = loadIndex();
  index.runs.unshift({
    id: run.id,
    timestamp: run.timestamp,
    filename,
    summary: {
      providers: run.config.providers,
      totalTests: run.summary.totalTests,
      successRate: run.summary.successRate,
    },
  });
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}
```

### Loading Runs

```typescript
function loadIndex(): IndexFile {
  if (!existsSync(INDEX_PATH)) {
    return { runs: [] };
  }
  return JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
}

function loadTestRun(id: string): TestRunFile | null {
  const index = loadIndex();
  const entry = index.runs.find(r => r.id === id);
  if (!entry) return null;
  
  const filepath = join(RESULTS_DIR, entry.filename);
  if (!existsSync(filepath)) return null;
  
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

function listRecentRuns(limit: number = 10): IndexEntry[] {
  const index = loadIndex();
  return index.runs.slice(0, limit);
}
```

### Deleting Runs

```typescript
function deleteTestRun(id: string): boolean {
  const index = loadIndex();
  const entryIndex = index.runs.findIndex(r => r.id === id);
  if (entryIndex === -1) return false;
  
  const entry = index.runs[entryIndex];
  const filepath = join(RESULTS_DIR, entry.filename);
  
  // Delete the file
  if (existsSync(filepath)) {
    unlinkSync(filepath);
  }
  
  // Update index
  index.runs.splice(entryIndex, 1);
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  
  return true;
}
```

---

## Data Retention

- No automatic cleanup by default
- Manual cleanup via Settings page
- Export before delete option
- Consider adding configurable retention policy (e.g., keep last 30 days)

---

## Export Formats

### JSON Export

Direct copy of the test run file(s).

### CSV Export

Flattened structure for spreadsheet analysis:

```csv
timestamp,provider,scenario,run,attempt,success,duration_ms,input_tokens,output_tokens
2025-11-26T10:30:00.000Z,openai,1,1,1,true,1250,450,120
2025-11-26T10:30:00.000Z,openai,1,1,2,false,1100,550,0
...
```

---

## Concurrency

- File writes use sync operations to avoid race conditions
- Only one test run can execute at a time (enforced by UI)
- Index updates are atomic (write complete file)

---

## .gitignore

Add to project `.gitignore`:

```
# Test data (optional - remove if you want to track results)
data/
```

Or to track results but not clutter the repo:

```
# Ignore result files but keep structure
data/results/*.json
!data/index.json
```
