# Test Scenarios

## Overview

Four test scenarios compare structured output adherence across different approaches:

1. **One-shot, non-strict** - Traditional prompt engineering
2. **One-shot, strict** - AI SDK `generateObject` with Zod
3. **Sequential, non-strict** - Multi-step prompt engineering
4. **Sequential, strict** - Multi-step `generateObject` with Zod

Each scenario runs **10 times per model** with up to **3 retries** per validation failure.

## Generation Configuration

All requests use these settings for optimal structured output reliability:

```typescript
const generationConfig = {
  temperature: 0.1,    // Low temperature for consistency
  maxTokens: 1500,     // Sufficient for full response
};
```

---

## Scenario 1: One-shot, Non-strict

### Description
Single request using `generateText` with format instructions embedded in the prompt.

### Flow
1. Build prompt with system instructions + conversation + format expectations
2. Send single request with `generateText`
3. Extract JSON from response (handle potential markdown wrapping)
4. Validate against Zod schema
5. If validation fails, retry with error feedback (up to 3 times)

### Prompt Structure

```
You are a recruiter AI assistant. Analyse the conversation and recommend 
a new team member who could help solve the problem being discussed.

Respond ONLY with valid JSON matching this exact structure:
{json_schema}

Important:
- Return ONLY valid JSON, no markdown code blocks or backticks
- All fields are required
- Follow the exact structure shown above

<conversation>
{conversation_messages}
</conversation>

Based on this conversation, recommend a team member to help solve their problem.
```

### JSON Extraction

```typescript
function extractJson(text: string): string {
  // Remove markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}
```

### Success Criteria
- Response contains valid JSON (after extraction)
- JSON passes full `ResponseSchema` Zod validation

---

## Scenario 2: One-shot, Strict

### Description
Single request using AI SDK's `generateObject` function with Zod schema enforcement.

### Flow
1. Build messages array with system prompt + conversation
2. Call `generateObject` with `ResponseSchema`
3. If AI SDK throws validation error, retry with error feedback (up to 3 times)

### Code Pattern

```typescript
import { generateObject } from 'ai';
import { ResponseSchema } from '@/lib/schemas';

const result = await generateObject({
  model: model.model,
  schema: ResponseSchema,
  temperature: 0.1,
  maxTokens: 1500,
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationMessages,
    { role: 'user', content: 'Recommend a team member to help solve this problem.' }
  ],
});
```

### Success Criteria
- `generateObject` returns without throwing
- Returned object is automatically typed and validated

---

## Scenario 3: Sequential, Non-strict

### Description
Three sequential requests using `generateText`, building the JSON response progressively.

### Flow

#### Step 1: Get initial recommendation
```
Based on the conversation, what type of team member should we add?

Respond with JSON:
{
  "recommendation": "I think you need to hire a [job title]...",
  "action": "create_actor"
}
```

Validate with `SequentialPart1Schema`, retry if needed.

#### Step 2: Get actor details
```
For the role you recommended, provide their details.

Respond with JSON:
{
  "title": "[job title]",
  "reason": "[why this role is needed]",
  "skills": ["skill1", "skill2", "skill3", ...]
}
```

Validate with `SequentialPart2Schema`, retry if needed.

#### Step 3: Get AI configuration
```
For this role, provide the AI system prompt and model type.

Respond with JSON:
{
  "prompt": "[system prompt for an AI in this role]",
  "model": "reasoning" or "semantic"
}
```

Validate with `SequentialPart3Schema`, retry if needed.

#### Final Assembly
Merge the three partial responses into the final `ResponseSchema` structure.

### Context Building

Each step includes prior context:

```typescript
// Step 2 includes Step 1's validated response
const step2Messages = [
  { role: 'system', content: systemPrompt },
  ...conversationMessages,
  { role: 'assistant', content: JSON.stringify(part1Result) },
  { role: 'user', content: step2Prompt },
];
```

### Success Criteria
- All three steps pass their respective Zod validations
- Final merged object passes `ResponseSchema` validation

---

## Scenario 4: Sequential, Strict

### Description
Three sequential `generateObject` calls with partial Zod schemas.

### Flow

Same as Scenario 3, but using `generateObject` instead of `generateText`:

```typescript
// Step 1
const part1 = await generateObject({
  model: model.model,
  schema: SequentialPart1Schema,
  temperature: 0.1,
  messages: [...context, { role: 'user', content: step1Prompt }],
});

// Step 2 - include Part 1 in context
const part2 = await generateObject({
  model: model.model,
  schema: SequentialPart2Schema,
  temperature: 0.1,
  messages: [
    ...context, 
    { role: 'assistant', content: JSON.stringify(part1.object) },
    { role: 'user', content: step2Prompt }
  ],
});

// Step 3 - include Parts 1 and 2 in context
const part3 = await generateObject({
  model: model.model,
  schema: SequentialPart3Schema,
  temperature: 0.1,
  messages: [
    ...context,
    { role: 'assistant', content: JSON.stringify(part1.object) },
    { role: 'assistant', content: JSON.stringify(part2.object) },
    { role: 'user', content: step3Prompt }
  ],
});
```

### Success Criteria
- All three `generateObject` calls succeed
- Final merged object passes `ResponseSchema` validation

---

## Retry Protocol

When a validation fails, the retry includes specific error context:

```typescript
const retryPrompt = `
<validation_retry>
Your previous response failed JSON validation:

<previous_response>
${previousResponse}
</previous_response>

<validation_errors>
${zodErrors.map(err => {
  const path = err.path.length > 0 ? err.path.join('.') : 'root';
  return `• ${path}: ${err.message}`;
}).join('\n')}
</validation_errors>

<instructions>
1. Review the specific validation errors above
2. Identify what needs to be fixed in your response
3. Generate a corrected response that addresses each error
</instructions>

Provide a corrected JSON response. Return ONLY valid JSON with no additional text.
</validation_retry>
`;
```

### Retry Tracking

Each retry is tracked separately:

```typescript
interface AttemptResult {
  attemptNumber: number;      // 1 = initial, 2-4 = retries
  success: boolean;
  durationMs: number;
  rawResponse: string;
  validationErrors?: ZodError[];
}
```

---

## Execution Order

Tests run sequentially (not in parallel) to:
- Avoid rate limiting issues
- Provide clearer progress feedback
- Ensure consistent timing measurements
- Prevent local machine overheating

### Order
```
For each model:
  For each scenario (1-4):
    For each run (1-10):
      Execute test (with up to 3 retries per validation failure)
```

### Estimated Duration

- 6 models × 4 scenarios × 10 runs = 240 test runs
- Average 2-5 seconds per API call
- Sequential scenarios have 3 calls each
- Estimated total: 15-30 minutes per full test suite

---

## Error Handling

### API Errors
- Network timeouts: Mark as failure, log error
- Rate limits: Wait and retry (exponential backoff)
- 5xx errors: Retry up to 2 times

### Validation Errors
- Zod parsing failures: Trigger retry protocol
- JSON syntax errors: Trigger retry protocol
- Missing fields: Trigger retry protocol

### Fatal Errors
- Invalid API key: Stop test suite
- Provider unavailable: Skip provider, continue with others
