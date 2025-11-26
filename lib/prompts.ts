import { z } from 'zod';
import {
  ResponseSchema,
  SequentialPart1Schema,
  SequentialPart2Schema,
  SequentialPart3Schema,
} from './schemas';

/**
 * Convert Zod schema to JSON Schema string for prompt instructions
 */
export function schemaToJsonString(schema: z.ZodType): string {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' });
  return JSON.stringify(jsonSchema, null, 2);
}

/**
 * System prompt for the recruiter AI
 */
export const systemPrompt = `You are a recruiter AI assistant. Your job is to analyse team conversations and recommend new team members who could help solve problems the team is facing.

When you identify a skill gap in the team, recommend a specific role that would fill that gap. Provide:
- A clear job title
- An explanation of why this role is needed
- The specific skills required
- A system prompt that could be used to configure an AI assistant for this role
- Whether the role requires "reasoning" (analytical/logical) or "semantic" (creative/conversational) capabilities

Be specific and practical in your recommendations.`;

/**
 * One-shot prompt with JSON schema instructions (non-strict mode)
 */
export function getOneShotPrompt(): string {
  return `Based on the conversation above, recommend a team member who could help solve their problem.

Respond ONLY with valid JSON matching this exact structure:
${schemaToJsonString(ResponseSchema)}

Important:
- Return ONLY valid JSON, no markdown code blocks or backticks
- All fields are required unless marked as nullable
- The "recommendation" field should start with "I think you need to hire..."
- Skills array should have 3-7 items
- Follow the exact structure shown above`;
}

/**
 * One-shot prompt for strict mode (simpler, schema enforced by API)
 */
export const oneShotStrictPrompt = `Based on the conversation above, recommend a team member who could help solve their problem.

Your recommendation should include:
- A clear explanation of why you're recommending this role
- The job title
- Why this role addresses their specific problem
- 3-7 required skills
- A system prompt for an AI in this role
- Whether "reasoning" or "semantic" model type is best suited`;

/**
 * Sequential prompts for multi-step generation
 */
export const sequentialPrompts = {
  step1: {
    nonStrict: `Based on the conversation, what type of team member should this team add?

Respond with JSON:
${schemaToJsonString(SequentialPart1Schema)}

Important:
- Return ONLY valid JSON, no markdown code blocks
- The "recommendation" should explain your hiring recommendation
- Set "action" to "create_actor" if recommending someone, or null if not`,

    strict: `Based on the conversation, what type of team member should this team add?

Provide a recommendation explaining who they should hire and why. Set action to "create_actor" to recommend a new team member.`,
  },

  step2: {
    nonStrict: `For the role you recommended, provide their details.

Respond with JSON:
${schemaToJsonString(SequentialPart2Schema)}

Important:
- Return ONLY valid JSON, no markdown code blocks
- Provide 3-7 specific skills
- The "reason" should explain how this role addresses the team's problem`,

    strict: `For the role you recommended, provide their details.

Include:
- The specific job title
- Why this role addresses the team's skill gap
- 3-7 specific technical skills they would need`,
  },

  step3: {
    nonStrict: `For this role, provide the AI system prompt and model type.

Respond with JSON:
${schemaToJsonString(SequentialPart3Schema)}

Important:
- Return ONLY valid JSON, no markdown code blocks
- The "prompt" should be a system prompt for an AI assistant in this role
- "model" should be "reasoning" for analytical tasks or "semantic" for creative tasks`,

    strict: `For this role, provide the AI configuration.

Include:
- A system prompt that would configure an AI assistant for this role
- Whether "reasoning" (for analytical/logical tasks) or "semantic" (for creative/conversational tasks) model type is more appropriate`,
  },
};

/**
 * Retry prompt when validation fails
 */
export function getRetryPrompt(
  previousResponse: string,
  validationErrors: Array<{ path: string[]; message: string }>
): string {
  const errorList = validationErrors
    .map((err) => {
      const path = err.path.length > 0 ? err.path.join('.') : 'root';
      return `• ${path}: ${err.message}`;
    })
    .join('\n');

  return `<validation_retry>
Your previous response failed JSON validation:

<previous_response>
${previousResponse}
</previous_response>

<validation_errors>
${errorList}
</validation_errors>

<instructions>
1. Review the specific validation errors above
2. Identify what needs to be fixed in your response
3. Generate a corrected response that addresses each error
</instructions>

Provide a corrected JSON response. Return ONLY valid JSON with no additional text, explanations, or markdown formatting.
</validation_retry>`;
}

/**
 * Extract JSON from a response that might be wrapped in markdown code blocks
 */
export function extractJson(text: string): string {
  let cleaned = text.trim();
  
  // Remove markdown code fences
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
