# Schema Specification

## Best Practices Applied

Based on research into structured output reliability, this schema follows these principles:

1. **Descriptive field names** - Research shows field naming dramatically impacts accuracy (e.g., "final_choice" → "answer" improved accuracy from 4.5% to 95%)
2. **Rich descriptions** - Every field includes a `.describe()` to guide the model
3. **Flat structure** - Maximum 3 levels of nesting (providers support up to 5, we stay conservative)
4. **All fields required** - Use `.nullable()` instead of `.optional()` for better model behaviour
5. **Low temperature** - Use 0.1 for structured output generation
6. **additionalProperties: false** - Required by OpenAI and Anthropic

## Target JSON Structure

The LLM must generate a response matching this exact structure:

```json
{
  "recommendation": "I think you need to hire a [job title]",
  "action": {
    "type": "create_actor",
    "actor": {
      "title": "Database Administrator",
      "reason": "The team lacks database expertise...",
      "skills": ["PostgreSQL", "Query Optimization", "Schema Design"],
      "prompt": "You are an expert database administrator...",
      "model": "reasoning"
    }
  }
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `recommendation` | string | Conversational response explaining the hiring recommendation |
| `action` | object \| null | The action to take, or null if no recommendation |
| `action.type` | "create_actor" | Action type identifier (literal) |
| `action.actor.title` | string | The job title for the new team member |
| `action.actor.reason` | string | Explanation of why this role addresses the team's gap |
| `action.actor.skills` | string[] | Array of 3-5 required skills |
| `action.actor.prompt` | string | System prompt for an AI actor in this role |
| `action.actor.model` | "reasoning" \| "semantic" | Model type suited for this role |

## Zod Schema

```typescript
import { z } from 'zod';

/**
 * Model type enum - reasoning for analytical tasks, semantic for creative/conversational
 */
export const ModelTypeSchema = z.enum(['reasoning', 'semantic'])
  .describe('Model type: "reasoning" for analytical/logical tasks, "semantic" for creative/conversational tasks');

/**
 * Actor definition - the new team member being recommended
 */
export const ActorSchema = z.object({
  title: z.string()
    .min(2)
    .describe('Job title for the recommended team member (e.g., "Database Administrator", "DevOps Engineer")'),
  
  reason: z.string()
    .min(20)
    .describe('Explanation of why this role is needed and how it addresses the team\'s skill gap'),
  
  skills: z.array(z.string())
    .min(3)
    .max(7)
    .describe('Array of 3-7 specific technical skills required for this role'),
  
  prompt: z.string()
    .min(30)
    .describe('System prompt to configure an AI assistant for this role, describing their expertise and approach'),
  
  model: ModelTypeSchema,
});

/**
 * Action wrapper - contains the action type and actor data
 */
export const ActionSchema = z.object({
  type: z.literal('create_actor')
    .describe('Action type identifier'),
  
  actor: ActorSchema
    .describe('Details of the team member to add'),
});

/**
 * Full response schema - the complete LLM output
 */
export const ResponseSchema = z.object({
  recommendation: z.string()
    .min(20)
    .describe('A conversational message explaining the hiring recommendation, starting with "I think you need to hire..."'),
  
  action: ActionSchema.nullable()
    .describe('The action to take: create_actor to recommend a new team member, or null if no recommendation is appropriate'),
});

// Type exports for TypeScript
export type ModelType = z.infer<typeof ModelTypeSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Response = z.infer<typeof ResponseSchema>;
```

## Sequential Schema Partials

For sequential requests, the schema is split into three parts. Each part is self-contained and validatable.

### Part 1: Initial Recommendation

```typescript
export const SequentialPart1Schema = z.object({
  recommendation: z.string()
    .min(20)
    .describe('A conversational message explaining the hiring recommendation'),
  
  action: z.literal('create_actor').nullable()
    .describe('Set to "create_actor" if recommending a new team member, or null if not'),
});
```

Expected output:
```json
{
  "recommendation": "I think you need to hire a Database Administrator to help with your query performance issues.",
  "action": "create_actor"
}
```

### Part 2: Actor Details

```typescript
export const SequentialPart2Schema = z.object({
  title: z.string()
    .min(2)
    .describe('Job title for the recommended team member'),
  
  reason: z.string()
    .min(20)
    .describe('Explanation of why this role is needed'),
  
  skills: z.array(z.string())
    .min(3)
    .max(7)
    .describe('Array of 3-7 specific technical skills required'),
});
```

Expected output:
```json
{
  "title": "Database Administrator",
  "reason": "Your team is struggling with query optimization and schema design. A DBA can analyze query plans, implement proper indexing strategies, and advise on potential database architecture changes.",
  "skills": ["PostgreSQL", "Query Optimization", "Index Design", "EXPLAIN Analysis", "Schema Design"]
}
```

### Part 3: AI Configuration

```typescript
export const SequentialPart3Schema = z.object({
  prompt: z.string()
    .min(30)
    .describe('System prompt to configure an AI assistant for this role'),
  
  model: ModelTypeSchema
    .describe('Model type suited for this role'),
});
```

Expected output:
```json
{
  "prompt": "You are an expert database administrator with deep knowledge of PostgreSQL, query optimization, and database architecture. You approach problems methodically, analyzing query plans and suggesting evidence-based improvements.",
  "model": "reasoning"
}
```

### Merging Sequential Parts

```typescript
function mergeSequentialParts(
  part1: z.infer<typeof SequentialPart1Schema>,
  part2: z.infer<typeof SequentialPart2Schema>,
  part3: z.infer<typeof SequentialPart3Schema>
): Response {
  return {
    recommendation: part1.recommendation,
    action: part1.action === 'create_actor' ? {
      type: 'create_actor',
      actor: {
        title: part2.title,
        reason: part2.reason,
        skills: part2.skills,
        prompt: part3.prompt,
        model: part3.model,
      },
    } : null,
  };
}
```

## Schema Conversion for Prompt Instructions

When not using strict mode, convert the Zod schema to human-readable JSON Schema:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

export function schemaToPromptInstructions(schema: z.ZodSchema): string {
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: 'none', // Inline all definitions for clarity
  });
  
  return `Respond with valid JSON matching this schema:

${JSON.stringify(jsonSchema, null, 2)}

Important:
- Return ONLY valid JSON, no markdown code blocks
- All fields are required unless marked nullable
- Follow the exact structure shown above`;
}
```

## Generation Configuration

For optimal structured output reliability:

```typescript
export const structuredOutputConfig = {
  temperature: 0.1,        // Low temperature for consistency
  maxTokens: 1500,         // Enough for the full response
  topP: 0.95,              // Slight diversity while maintaining focus
};
```

## Schema Complexity Analysis

Our schema is designed to be well within provider limits:

| Metric | Our Schema | OpenAI Limit | Anthropic Limit |
|--------|------------|--------------|-----------------|
| Nesting depth | 3 levels | 5 levels | Not specified |
| Total properties | 7 | ~100 | Not specified |
| Array items | 3-7 | Unlimited | minItems: 0 or 1 only |
| String lengths | min only | No min/max | No min/max |

This conservative approach maximises compatibility and reliability across all providers.
