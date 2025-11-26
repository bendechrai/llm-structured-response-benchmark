# Metrics and Reporting

## Collected Metrics

### Per Request

| Metric | Type | Description |
|--------|------|-------------|
| `requestId` | string | Unique identifier for this request |
| `timestamp` | ISO 8601 | When the request was made |
| `modelId` | string | Model ID (e.g., "openai-gpt5", "anthropic-sonnet") |
| `provider` | string | Provider name (openai, anthropic, google) |
| `scenario` | number | Scenario number (1-4) |
| `runNumber` | number | Run number within scenario (1-10) |
| `stepNumber` | number | Step within run (1 for one-shot, 1-3 for sequential) |
| `attemptNumber` | number | Attempt number (1-4, where 1 is initial, 2-4 are retries) |
| `success` | boolean | Whether validation passed |
| `durationMs` | number | Request duration in milliseconds |
| `inputTokens` | number | Tokens in the prompt (if available) |
| `outputTokens` | number | Tokens in the response (if available) |
| `rawResponse` | string | The raw response from the LLM |
| `parsedResponse` | object \| null | Parsed JSON if successful |
| `validationErrors` | array | Zod validation errors if failed |
| `errorMessage` | string \| null | Error message if request failed |

### Per Run (aggregated)

| Metric | Type | Description |
|--------|------|-------------|
| `runId` | string | Unique identifier for this run |
| `modelId` | string | Model ID |
| `provider` | string | Provider name |
| `scenario` | number | Scenario number |
| `runNumber` | number | Run number (1-10) |
| `success` | boolean | Final success after all retries |
| `totalAttempts` | number | Total attempts including retries |
| `totalDurationMs` | number | Total duration including retries |
| `retriesRequired` | number | Number of retries needed (0 if first attempt succeeded) |
| `finalResponse` | object | The final validated response |

### Per Model/Scenario (aggregated)

| Metric | Type | Description |
|--------|------|-------------|
| `modelId` | string | Model ID |
| `provider` | string | Provider name |
| `scenario` | number | Scenario number |
| `totalRuns` | number | Total runs (10) |
| `successfulRuns` | number | Runs that eventually succeeded |
| `successRate` | number | Percentage of successful runs |
| `firstAttemptSuccesses` | number | Runs that succeeded on first attempt |
| `firstAttemptSuccessRate` | number | Percentage succeeding on first attempt |
| `afterRetry1Successes` | number | Cumulative successes after 1 retry |
| `afterRetry1SuccessRate` | number | Cumulative success rate after 1 retry |
| `afterRetry2Successes` | number | Cumulative successes after 2 retries |
| `afterRetry2SuccessRate` | number | Cumulative success rate after 2 retries |
| `afterRetry3Successes` | number | Cumulative successes after 3 retries |
| `afterRetry3SuccessRate` | number | Cumulative success rate after 3 retries |
| `averageDurationMs` | number | Average duration per successful run |
| `averageAttempts` | number | Average attempts per run |
| `totalTokensUsed` | number | Total tokens consumed |

---

## Derived Metrics

### Model Comparison

For each model, aggregate across all scenarios:
- Overall success rate
- Overall first-attempt success rate
- Strict vs non-strict performance delta
- One-shot vs sequential performance delta
- Average tokens per successful run

### Provider Comparison

For each provider, aggregate across all models:
- Best performing model
- Average success rate
- Consistency (variance) across models

### Scenario Comparison

For each scenario, aggregate across all models:
- Best performing model
- Worst performing model
- Variance across models
- Average retry count

### Retry Effectiveness

Calculate how much retries improve success rate:
```typescript
retryEffectiveness = (finalSuccessRate - firstAttemptSuccessRate) / (100 - firstAttemptSuccessRate)
```

This shows what percentage of failures were recovered via retries.

---

## Report Output

### Summary Table

```
┌─────────────────────┬────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Model               │ Scenario   │ First Try   │ After 1     │ After 2     │ Final       │
├─────────────────────┼────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ GPT-5               │ 1 (OS/NS)  │ 90%         │ 95%         │ 100%        │ 100%        │
│ GPT-5               │ 2 (OS/S)   │ 100%        │ 100%        │ 100%        │ 100%        │
│ GPT-5               │ 3 (Seq/NS) │ 80%         │ 90%         │ 95%         │ 95%         │
│ GPT-5               │ 4 (Seq/S)  │ 100%        │ 100%        │ 100%        │ 100%        │
├─────────────────────┼────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ GPT-4o              │ 1 (OS/NS)  │ 85%         │ 92%         │ 98%         │ 100%        │
│ ...                 │ ...        │ ...         │ ...         │ ...         │ ...         │
├─────────────────────┼────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Claude Sonnet 4.5   │ ...        │ ...         │ ...         │ ...         │ ...         │
│ Claude Opus 4.1     │ ...        │ ...         │ ...         │ ...         │ ...         │
├─────────────────────┼────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Gemini 2.5 Flash    │ ...        │ ...         │ ...         │ ...         │ ...         │
│ Gemini 3 Pro        │ ...        │ ...         │ ...         │ ...         │ ...         │
└─────────────────────┴────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

Legend: OS = One-shot, Seq = Sequential, NS = Non-strict, S = Strict
```

### Provider Summary

```
┌───────────┬─────────────────┬─────────────────┬─────────────┐
│ Provider  │ Best Model      │ Avg First Try   │ Avg Final   │
├───────────┼─────────────────┼─────────────────┼─────────────┤
│ OpenAI    │ GPT-5           │ 92%             │ 99%         │
│ Anthropic │ Claude Opus 4.1 │ 88%             │ 97%         │
│ Google    │ Gemini 3 Pro    │ 75%             │ 94%         │
└───────────┴─────────────────┴─────────────────┴─────────────┘
```

### Comparison Charts (UI)

1. **Success Rate by Model** - Bar chart comparing all 6 models
2. **Provider Comparison** - Grouped bars showing models within each provider
3. **Strict vs Non-strict** - Side-by-side comparison per model
4. **One-shot vs Sequential** - Performance comparison per model
5. **Retry Effectiveness** - Shows how retries improve success per model
6. **Historical Trend** - Line chart of success rates over time (multiple test runs)

---

## Statistical Notes

- 10 runs per model/scenario provides reasonable statistical significance
- Report standard deviation alongside averages
- Consider runs that exceed 30 seconds as timeouts (failure)
- Track token usage for cost estimation

### Cost Estimation

```typescript
const costPerModel = {
  'openai-gpt5': { input: 0.01, output: 0.03 },      // per 1K tokens
  'openai-gpt4o': { input: 0.0025, output: 0.01 },
  'anthropic-sonnet': { input: 0.003, output: 0.015 },
  'anthropic-opus': { input: 0.015, output: 0.075 },
  'google-flash': { input: 0.000075, output: 0.0003 },
  'google-pro': { input: 0.00125, output: 0.005 },
};
```

---

## Export Formats

Results can be exported as:
- **JSON** - Native storage format, full detail
- **CSV** - Flattened for spreadsheet analysis
- **Markdown** - Summary tables for documentation

### CSV Structure

```csv
timestamp,model_id,provider,scenario,run,attempt,success,duration_ms,input_tokens,output_tokens
2025-11-26T10:30:00.000Z,openai-gpt5,openai,1,1,1,true,1250,450,120
2025-11-26T10:30:02.000Z,openai-gpt5,openai,1,2,1,false,1100,450,95
2025-11-26T10:30:05.000Z,openai-gpt5,openai,1,2,2,true,1300,620,130
...
```
