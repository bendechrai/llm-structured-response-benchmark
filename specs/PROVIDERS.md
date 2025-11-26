# Provider Configuration

## Overview

Six models across three providers are tested. Each provider has specific configuration requirements for structured outputs.

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Optional (for future OpenRouter testing)
OPENROUTER_API_KEY=sk-or-...
```

---

## OpenAI

OpenAI has the most mature structured output implementation, launched August 2024. They claim 100% schema compliance using constrained decoding.

### Models

| Model ID | Description |
|----------|-------------|
| `gpt-5` | Latest flagship (August 2025), best overall performance |
| `gpt-4o` | Previous flagship, excellent structured output support |

### Package
```bash
npm install @ai-sdk/openai@beta
```

### Configuration

```typescript
import { openai } from '@ai-sdk/openai';

export const openaiModels = [
  {
    id: 'openai-gpt5',
    name: 'OpenAI GPT-5',
    provider: 'openai',
    model: openai('gpt-5'),
    supportsStrictMode: true,
  },
  {
    id: 'openai-gpt4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    model: openai('gpt-4o'),
    supportsStrictMode: true,
  },
];
```

### Strict Mode Notes
- Uses constrained decoding for guaranteed schema compliance
- First request with a new schema incurs latency for grammar compilation
- Supports up to 5 levels of nesting (we stay under this)
- All fields must be `required` (use union with `null` for optional)
- `additionalProperties: false` is mandatory

---

## Anthropic

Anthropic launched structured outputs in November 2025 (beta). Both supported models receive identical capabilities.

### Models

| Model ID | Description |
|----------|-------------|
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 - fast, capable |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 - more powerful reasoning |

### Package
```bash
npm install @ai-sdk/anthropic@beta
```

### Configuration

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  headers: {
    'anthropic-beta': 'structured-outputs-2025-11-13',
  },
});

export const anthropicModels = [
  {
    id: 'anthropic-sonnet',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    model: anthropic('claude-sonnet-4-5-20250929', {
      structuredOutputMode: 'outputFormat',
    }),
    supportsStrictMode: true,
  },
  {
    id: 'anthropic-opus',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    model: anthropic('claude-opus-4-1-20250805', {
      structuredOutputMode: 'outputFormat',
    }),
    supportsStrictMode: true,
  },
];
```

### Strict Mode Notes
- Requires `structured-outputs-2025-11-13` beta header
- Must use `structuredOutputMode: 'outputFormat'` for native structured outputs
- Does NOT support recursive schemas (unlike OpenAI)
- No numerical constraints (`minimum`, `maximum`)
- `additionalProperties: false` is mandatory
- Schema grammars are cached for 24 hours

---

## Google Gemini

Google's structured output uses JSON schema via `responseMimeType` and `responseJsonSchema`. Recent improvements added JSON Schema keyword support.

### Models

| Model ID | Description |
|----------|-------------|
| `gemini-2.5-flash` | Fast, cost-effective (~15x cheaper than Pro) |
| `gemini-3-pro-preview` | Latest flagship (November 2025), improved reasoning |

### Package
```bash
npm install @ai-sdk/google@beta
```

### Configuration

```typescript
import { google } from '@ai-sdk/google';

export const googleModels = [
  {
    id: 'google-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    model: google('gemini-2.5-flash'),
    supportsStrictMode: true,
  },
  {
    id: 'google-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    model: google('gemini-3-pro-preview'),
    supportsStrictMode: true,
  },
];
```

### Strict Mode Notes
- Based on OpenAPI 3.0 schema subset (not full JSON Schema)
- Recent update added support for `anyOf`, `$ref`, and key ordering
- Gemini 2.0 required explicit `propertyOrdering` - 2.5+ preserves order automatically
- Independent testing shows ~84% success without retries, ~97% with one retry
- May return `InvalidArgument: 400` for very complex schemas

---

## Model Registry

```typescript
// lib/models.ts

export const models = [
  ...openaiModels,
  ...anthropicModels,
  ...googleModels,
] as const;

export type ModelId = typeof models[number]['id'];

export function getModel(id: ModelId) {
  return models.find(m => m.id === id);
}

export function getModelsByProvider(provider: 'openai' | 'anthropic' | 'google') {
  return models.filter(m => m.provider === provider);
}
```

---

## Provider Comparison

| Provider | Native Strict | Schema Format | Reliability | Notes |
|----------|--------------|---------------|-------------|-------|
| OpenAI | ✅ Full | JSON Schema (subset) | Highest | Most mature, 100% on accepted schemas |
| Anthropic | ✅ Full (beta) | JSON Schema (subset) | High | No recursive schemas |
| Google | ⚠️ Partial | OpenAPI 3.0 subset | Medium | May need retries for complex schemas |

---

## Future: OpenRouter

OpenRouter can proxy requests to multiple providers with a unified API.

### Configuration

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// For structured outputs with OpenRouter
const model = openrouter('anthropic/claude-sonnet-4.5', {
  headers: {
    'anthropic-beta': 'structured-outputs-2025-11-13',
  },
  providerPreferences: {
    require_parameters: true, // Force routing to providers that support json_schema
  },
});
```

### Notes
- Setting `require_parameters: true` forces routing to providers with full JSON schema support
- Without this flag, may fall back to weaker `json_object` mode
- Provider-specific headers must be passed through
