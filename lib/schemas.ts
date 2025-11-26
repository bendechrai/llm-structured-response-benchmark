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

// Sequential schemas for multi-step generation

/**
 * Part 1: Initial recommendation
 */
export const SequentialPart1Schema = z.object({
  recommendation: z.string()
    .min(20)
    .describe('A conversational message explaining the hiring recommendation'),
  
  action: z.literal('create_actor').nullable()
    .describe('Set to "create_actor" if recommending a new team member, or null if not'),
});

/**
 * Part 2: Actor details
 */
export const SequentialPart2Schema = z.object({
  title: z.string()
    .min(2)
    .describe('Job title for the recommended team member'),
  
  reason: z.string()
    .min(20)
    .describe('Explanation of why this role is needed'),
  
  skills: z.array(z.string())
    .describe('Array of 3-7 specific technical skills required')
});

/**
 * Part 3: AI configuration
 */
export const SequentialPart3Schema = z.object({
  prompt: z.string()
    .min(30)
    .describe('System prompt to configure an AI assistant for this role'),
  
  model: ModelTypeSchema
    .describe('Model type suited for this role'),
});

// Type exports
export type ModelType = z.infer<typeof ModelTypeSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Response = z.infer<typeof ResponseSchema>;
export type SequentialPart1 = z.infer<typeof SequentialPart1Schema>;
export type SequentialPart2 = z.infer<typeof SequentialPart2Schema>;
export type SequentialPart3 = z.infer<typeof SequentialPart3Schema>;

/**
 * Merge sequential parts into final response
 */
export function mergeSequentialParts(
  part1: SequentialPart1,
  part2: SequentialPart2,
  part3: SequentialPart3
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
