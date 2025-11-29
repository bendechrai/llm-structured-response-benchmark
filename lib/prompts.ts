/**
 * Prompts for the LLM benchmark tests
 * Uses example-based prompts instead of JSON Schema to avoid "schema echo" problem
 * where models return the schema definition instead of data conforming to it.
 */

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
 * One-shot prompt with example (non-strict mode)
 */
export function getOneShotPrompt(): string {
  return `Based on the conversation above, recommend a team member who could help solve their problem.

Respond ONLY with valid JSON like this example:
{
  "recommendation": "I think you need to hire a [role] because [explanation of how they address the team's problem]...",
  "action": {
    "type": "create_actor",
    "actor": {
      "title": "Job Title Here",
      "reason": "Why this role addresses the team's skill gap",
      "skills": ["skill1", "skill2", "skill3"],
      "prompt": "You are an expert in [domain]. You help teams by [description of approach]...",
      "model": "reasoning"
    }
  }
}

Important:
- Return ONLY valid JSON, no markdown code blocks or backticks
- The "recommendation" field should start with "I think you need to hire..."
- Skills array should have 3-7 specific technical skills
- "model" should be "reasoning" for analytical tasks or "semantic" for creative tasks
- Set "action" to null if no recommendation is appropriate`;
}

/**
 * One-shot prompt for strict mode (simpler, schema enforced by API)
 */
export const oneShotStrictPrompt = `Based on the conversation above, recommend a team member who could help solve their problem.

Respond with a JSON object containing:
- "recommendation": Your explanation of why you're recommending this role
- "action": An object with "type": "create_actor" and "actor" containing:
  - "title": The job title
  - "reason": Why this role addresses the team's problem
  - "skills": Array of 3-7 required skills
  - "prompt": A system prompt for an AI in this role
  - "model": Either "reasoning" or "semantic"`;

/**
 * Sequential prompts for multi-step generation
 */
export const sequentialPrompts = {
  step1: {
    nonStrict: `Based on the conversation, what type of team member should this team add?

Respond with JSON like this example:
{"recommendation": "I recommend hiring a [role] because [reason]...", "action": "create_actor"}

Important:
- Return ONLY valid JSON, no markdown code blocks
- The "recommendation" should explain your hiring recommendation (at least 20 characters)
- Set "action" to "create_actor" if recommending someone, or null if not`,

    strict: `Based on the conversation, what type of team member should this team add?

Respond with a JSON object containing:
- "recommendation": A string explaining who should be hired and why
- "action": Either "create_actor" to recommend someone, or null

Example: {"recommendation": "I recommend hiring...", "action": "create_actor"}`,
  },

  step2: {
    nonStrict: `For the role you recommended, provide their details.

Respond with JSON like this example:
{"title": "Database Administrator", "reason": "The team needs database expertise to optimize their slow queries and design scalable schemas", "skills": ["PostgreSQL", "Query Optimization", "Database Design"]}

Important:
- Return ONLY valid JSON, no markdown code blocks
- Provide 3-7 specific technical skills
- The "reason" should explain how this role addresses the team's problem (at least 20 characters)`,

    strict: `For the role you recommended, provide their details.

Respond with a JSON object containing:
- "title": The job title (e.g., "Database Administrator")
- "reason": Why this role addresses the team's skill gap
- "skills": An array of 3-7 specific technical skills

Example: {"title": "Senior DBA", "reason": "The team needs...", "skills": ["PostgreSQL", "Query Optimization"]}`,
  },

  step3: {
    nonStrict: `For this role, provide the AI system prompt and model type.

Respond with JSON like this example:
{"prompt": "You are an expert database administrator. You help teams optimize queries, design schemas, and ensure data integrity...", "model": "reasoning"}

Important:
- Return ONLY valid JSON, no markdown code blocks
- The "prompt" should be a detailed system prompt (at least 30 characters)
- "model" should be "reasoning" for analytical tasks or "semantic" for creative tasks`,

    strict: `For this role, provide the AI configuration.

Respond with a JSON object containing:
- "prompt": A system prompt for configuring an AI assistant in this role
- "model": Either "reasoning" (for analytical/logical tasks) or "semantic" (for creative/conversational tasks)

Example: {"prompt": "You are an expert database administrator...", "model": "reasoning"}`,
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
