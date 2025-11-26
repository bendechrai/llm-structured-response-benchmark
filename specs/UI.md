# Web Interface Specification

## Overview

A Next.js web application for running benchmarks, viewing results, and tracking historical performance across 6 LLM models.

---

## Pages

### 1. Dashboard (`/`)

**Purpose:** Show most recent test results and quick actions

**Components:**
- **Header** - App title, last run timestamp
- **Summary Cards** - One per model (6 total) showing:
  - Model name and provider badge
  - Overall success rate (latest run)
  - Best scenario / worst scenario
  - Trend indicator (up/down from previous run)
- **Provider Groups** - Visual grouping:
  - OpenAI: GPT-5, GPT-4o
  - Anthropic: Claude Sonnet 4.5, Claude Opus 4.1
  - Google: Gemini 2.5 Flash, Gemini 3 Pro
- **Quick Actions**
  - "Run All Tests" button
  - "Run Single Model" dropdown
  - "Run Provider" dropdown (all models for one provider)
- **Recent Results Table** - Last 5 test runs with:
  - Date/time
  - Models tested
  - Overall success rate
  - Link to detailed view

### 2. Test Runner (`/run`)

**Purpose:** Execute tests with live progress feedback

**Components:**
- **Configuration Panel**
  - Model checkboxes grouped by provider
  - Scenario checkboxes (1-4)
  - Number of runs (default 10)
  - "Select All" / "Deselect All" helpers
- **Progress Display**
  - Current model / scenario / run / attempt
  - Progress bar (X of 240 total tests)
  - Live log of requests/responses
  - Running success count per model
- **Results Preview**
  - Updates in real-time as tests complete
  - Shows pass/fail for each run
  - Retry indicators

**Behaviour:**
- Tests run sequentially
- Progress updates via Server-Sent Events or polling
- "Cancel" button to stop mid-run
- Auto-navigate to results page when complete

### 3. Results Detail (`/results/[id]`)

**Purpose:** Detailed view of a single test run

**Components:**
- **Summary Header**
  - Run date/time
  - Total duration
  - Overall pass rate
  - Models tested
- **Model Tabs** - Switch between models (6 tabs)
- **Scenario Breakdown** - For selected model:
  - Success rate by attempt (1st try, after retry 1, etc.)
  - Average duration
  - Total tokens used
  - Visual heatmap of runs
- **Individual Runs** - Expandable list showing:
  - Run number
  - Pass/fail status
  - Number of attempts
  - Duration
  - Expand to see raw request/response
  - Expand to see validation errors (if any)

### 4. Comparison View (`/compare`)

**Purpose:** Side-by-side model comparison

**Components:**
- **Model Selector** - Choose 2-6 models to compare
- **Scenario Filter** - Filter by scenario type
- **Comparison Table** - All models side by side:
  - First attempt success rate
  - Final success rate
  - Average duration
  - Retry effectiveness
- **Charts**
  - Grouped bar chart by scenario
  - Radar chart of capabilities
  - Provider colour coding

### 5. Historical View (`/history`)

**Purpose:** Compare results across multiple test runs over time

**Components:**
- **Date Range Selector**
- **Model Filter** - Multi-select
- **Provider Filter**
- **Trend Charts**
  - Success rate over time per model (line chart)
  - First-attempt success rate over time
  - Provider comparison over time
- **Run List** - All historical runs with:
  - Date
  - Summary stats
  - Link to detail view
  - Delete button (with confirmation)

### 6. Settings (`/settings`)

**Purpose:** Configure API keys and preferences

**Components:**
- **API Keys** (stored in `.env.local`, display masked)
  - OpenAI API Key status (✓ or ✗)
  - Anthropic API Key status
  - Google API Key status
- **Model Configuration**
  - Enable/disable specific models
  - Override model IDs if needed
- **Test Configuration**
  - Default number of runs (1-20)
  - Timeout threshold (seconds)
  - Max retries (1-5)
  - Temperature (0.0-1.0)
- **Data Management**
  - Export all results (JSON/CSV)
  - Clear historical data (with confirmation)
  - Storage location info

---

## UI Components

### Shared Components

```typescript
// Model identification
<ModelBadge modelId="openai-gpt5" />
<ProviderBadge provider="openai" />

// Status indicators
<SuccessRate value={0.85} />                    // Percentage with colour
<AttemptIndicator attempts={[true, false, true]} />  // Visual dots
<TrendIndicator current={92} previous={88} />   // Up/down arrow

// Data display
<JsonViewer data={object} />                    // Syntax-highlighted JSON
<ValidationErrors errors={zodErrors} />          // Formatted error list
<TokenUsage input={450} output={120} />         // Token display with cost
```

### Colour Coding

**Success Rates:**
| Rate | Colour | Usage |
|------|--------|-------|
| 100% | Green (#22c55e) | Perfect score |
| 80-99% | Light green (#86efac) | Good |
| 60-79% | Yellow (#fbbf24) | Needs improvement |
| 40-59% | Orange (#fb923c) | Poor |
| 0-39% | Red (#ef4444) | Failing |

**Providers:**
| Provider | Colour | 
|----------|--------|
| OpenAI | Green (#10a37f) |
| Anthropic | Orange (#d97706) |
| Google | Blue (#4285f4) |

---

## API Routes

### Test Execution

```typescript
POST /api/run
Body: {
  models: ['openai-gpt5', 'anthropic-sonnet', ...],
  scenarios: [1, 2, 3, 4],
  runsPerScenario: 10,
  temperature: 0.1,
  maxRetries: 3
}
Response: { runId: string }

GET /api/run/[id]/status
Response: {
  status: 'running' | 'complete' | 'cancelled',
  progress: { 
    current: 45, 
    total: 240,
    currentModel: 'openai-gpt5',
    currentScenario: 2,
    currentRun: 5
  }
}

GET /api/run/[id]/stream
Response: Server-Sent Events stream of progress updates

POST /api/run/[id]/cancel
Response: { success: boolean }
```

### Results

```typescript
GET /api/results
Query: { limit?: number, offset?: number }
Response: { runs: TestRun[], total: number }

GET /api/results/[id]
Response: TestRun (full detail)

GET /api/results/[id]/summary
Response: TestRunSummary (aggregated stats only)

DELETE /api/results/[id]
Response: { success: boolean }

GET /api/results/export
Query: { format: 'json' | 'csv', ids?: string[] }
Response: File download
```

### Models

```typescript
GET /api/models
Response: {
  models: [
    { id: 'openai-gpt5', name: 'GPT-5', provider: 'openai', enabled: true },
    ...
  ]
}

GET /api/models/health
Response: {
  'openai-gpt5': { status: 'ok', latencyMs: 234 },
  'anthropic-sonnet': { status: 'error', error: 'Invalid API key' },
  ...
}
```

---

## State Management

- Use React Server Components where possible
- Client state for:
  - Test progress (during run)
  - Filter/sort preferences
  - UI state (expanded sections, selected tabs)
- Server state for:
  - Test results (from file storage)
  - Model configuration

---

## Responsive Design

- Desktop-first (1280px+)
- Tablet (768px-1279px): 2-column model grid, collapsible sidebar
- Mobile (< 768px): Single column, essential info only, hamburger menu
- Charts resize appropriately

---

## Accessibility

- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Focus indicators on all interactive elements
- Colour-blind friendly palette:
  - Don't rely on colour alone
  - Include icons/shapes with status colours
  - High contrast text

---

## Performance

- Lazy load charts and detailed results
- Paginate large result sets (20 per page)
- Use React Suspense for loading states
- Cache API responses where appropriate
- Stream test progress to avoid polling
