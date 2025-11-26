# LLM Structured Response Adherence Benchmark

## Purpose

This tool benchmarks how well different LLM models adhere to structured JSON response formats. It tests both:

1. **One-shot approaches** - Single request with format instructions
2. **Sequential approaches** - Building JSON across multiple requests
3. **Strict mode** - Using AI SDK's `generateObject` with Zod schemas
4. **Non-strict mode** - Using `generateText` with format instructions in the prompt

## Core Concept

A static conversation between 5 participants discussing a software problem is presented to the LLM. The LLM must recommend an additional team member to help solve the problem, responding in a specific JSON format that includes:

- A conversational recommendation message
- An action to create a new "actor" with job title, reason, skills, system prompt, and model type

## Test Matrix

| Scenario | Request Type | Strict Mode | Requests per Run |
|----------|--------------|-------------|------------------|
| 1        | One-shot     | No          | 1                |
| 2        | One-shot     | Yes         | 1                |
| 3        | Sequential   | No          | 3                |
| 4        | Sequential   | Yes         | 3                |

Each scenario runs **10 times per model**, with up to **3 retries** per failed validation.

## Models Tested

### OpenAI
- **GPT-5** - Latest flagship (August 2025)
- **GPT-4o** - Previous generation flagship

### Anthropic
- **Claude Sonnet 4.5** - Fast, capable (requires `structured-outputs-2025-11-13` beta header)
- **Claude Opus 4.1** - More powerful reasoning

### Google Gemini
- **Gemini 2.5 Flash** - Fast, cost-effective
- **Gemini 3 Pro Preview** - Latest flagship (November 2025)

**Total: 6 models × 4 scenarios × 10 runs = 240 test runs**

## Best Practices Applied

Based on research into structured output reliability:

- **Descriptive field names** - "recommendation" not "msg", "title" not "jt"
- **Rich schema descriptions** - Every field includes guidance via `.describe()`
- **Conservative nesting** - Max 3 levels (providers support 5)
- **All fields required** - Use `.nullable()` instead of `.optional()`
- **Low temperature** - 0.1 for consistent output
- **Retry with context** - Failed validations include specific Zod errors

## Success Criteria

A test run is successful if the final JSON passes Zod validation. We track:

- Pass/fail per attempt
- Number of retries required
- First-attempt success rate
- Cumulative success rate after each retry
- Comparison across models and providers

## Tech Stack

- Next.js 15+ with App Router
- AI SDK 6.x (beta) with `generateObject` and `generateText`
- Zod for schema definition and validation
- Tailwind CSS for UI
- JSON file storage for historical results

## Related Specs

- [SCHEMA.md](./SCHEMA.md) - Zod schema definition with best practices
- [TEST_SCENARIOS.md](./TEST_SCENARIOS.md) - Detailed scenario descriptions
- [CONVERSATION.md](./CONVERSATION.md) - Static test conversation
- [PROVIDERS.md](./PROVIDERS.md) - Model configuration (6 models across 3 providers)
- [METRICS.md](./METRICS.md) - Metrics and reporting
- [UI.md](./UI.md) - Web interface requirements
- [STORAGE.md](./STORAGE.md) - Data persistence format
