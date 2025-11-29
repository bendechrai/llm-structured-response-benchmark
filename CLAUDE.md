# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an LLM Structured Output Benchmark tool that tests how well different language models (OpenAI, Anthropic, Google) adhere to specific JSON response formats. The application tests 4 different scenarios (one-shot vs sequential, strict vs non-strict mode) across 6 different models.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

The development server runs on http://localhost:3000

## Architecture Overview

### Core Structure
- **Next.js App Router** - Uses the modern app directory structure
- **AI SDK 6.x (beta)** - For LLM interactions via `generateObject` and `generateText`
- **Zod Schemas** - For structured output validation (`lib/schemas.ts`)
- **File-based Storage** - Test results stored as JSON files in local filesystem
- **React Components** - Reusable UI components in `components/` directory

### Key Directories
- `app/` - Next.js app router pages and API routes
- `lib/` - Core business logic (models, test runner, storage, schemas)
- `components/` - Reusable React components
- `specs/` - Detailed specifications and documentation

### Important Files
- `lib/models.ts` - Configuration for 6 LLM models across 3 providers (OpenAI, Anthropic, Google)
- `lib/test-runner.ts` - Core test execution engine with 4 test scenarios
- `lib/schemas.ts` - Zod schemas for structured output validation
- `lib/storage.ts` - File-based storage system for test results
- `app/api/run/route.ts` - API endpoint for running benchmark tests

### Model Configuration
The application tests:
- **OpenAI**: GPT-5, GPT-4o
- **Anthropic**: Claude Sonnet 4.5, Claude Opus 4.1 (with structured outputs beta header)
- **Google**: Gemini 2.5 Flash, Gemini 3 Pro Preview

### Test Scenarios
1. **Scenario 1**: One-shot, non-strict mode (using `generateText`)
2. **Scenario 2**: One-shot, strict mode (using `generateObject`)
3. **Scenario 3**: Sequential (3 requests), non-strict mode
4. **Scenario 4**: Sequential (3 requests), strict mode

Each scenario runs 10 times per model with up to 3 retries per failed validation.

## Environment Variables

API keys must be configured for each provider:
- `OPENAI_API_KEY` - OpenAI models
- `ANTHROPIC_API_KEY` - Anthropic models
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google models

## Development Notes

- Uses TypeScript with strict mode enabled
- ESLint configuration follows Next.js defaults
- No traditional database - uses JSON file storage for test results
- Background test execution with in-memory progress tracking
- Tailwind CSS for styling (configured in package.json)
- Force dynamic rendering for dashboard to show real-time data

## Testing Structure

Tests run asynchronously in the background via API routes. Progress is tracked in memory and results are persisted to JSON files. The dashboard shows real-time progress and historical results with provider-specific UI elements and success rate calculations.

## Unit Test Coverage

Run tests with `npm test` or `npm test -- --coverage` for coverage report.

### What We Test

- **schemas.ts** (100%) - Zod schema validation is critical for correctness
- **prompts.ts** (100%) - Prompt generation must be deterministic and correct
- **models.ts** (100%) - Model configuration validation
- **conversation.ts** (100%) - Conversation formatting for LLM context
- **storage.ts** (80%) - File I/O operations with mocked `fs` module
- **pricing** - Cost calculation functions and pricing data sanity checks

### What We Don't Test (and Why)

- **test-runner.ts** (0%) - This module's primary job is orchestrating AI SDK calls (`generateObject`, `generateText`). Testing it would require mocking the AI SDK responses, which would only test our mocking code, not actual LLM behaviour. The real validation happens via the benchmark runs themselves.

- **active-runs.ts** (0%) - Contains only a Map instantiation and globalThis assignment for hot-reload persistence. No logic to test.

- **React components** - Would require React Testing Library setup. The components are primarily presentational and the business logic they consume is tested via the lib modules.

- **API routes** - Integration test territory. The routes primarily wire together tested lib functions.