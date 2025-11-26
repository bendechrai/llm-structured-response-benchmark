import { generateObject, generateText } from 'ai';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { getModel, type ModelConfig } from './models';
import {
  ResponseSchema,
  SequentialPart1Schema,
  SequentialPart2Schema,
  SequentialPart3Schema,
  mergeSequentialParts,
  type SequentialPart1,
  type SequentialPart2,
  type SequentialPart3,
} from './schemas';
import { formatConversation } from './conversation';
import {
  systemPrompt,
  getOneShotPrompt,
  oneShotStrictPrompt,
  sequentialPrompts,
  getRetryPrompt,
  extractJson,
} from './prompts';
import {
  type AttemptResult,
  type RunResult,
  type ScenarioResult,
  type TestRunFile,
  type ValidationError,
  calculateScenarioSummary,
} from './storage';

export interface TestConfig {
  temperature: number;
  maxTokens: number;
  maxRetries: number;
  runsPerScenario: number;
}

export interface LogEntry {
  timestamp: string;
  modelId: string;
  modelName: string;
  scenario: number;
  runNumber: number;
  attemptNumber: number;
  type: 'request' | 'response' | 'validation';
  prompt?: string;
  response?: string;
  validationResult?: {
    success: boolean;
    errors?: Array<{ path: string[]; message: string; code: string }>;
  };
}

export interface TestProgress {
  modelId: string;
  modelName: string;
  scenario: number;
  runNumber: number;
  attemptNumber: number;
  status: 'running' | 'success' | 'failed' | 'retrying';
  message?: string;
  logEntry?: LogEntry;
}

export type ProgressCallback = (progress: TestProgress) => void;

const DEFAULT_CONFIG: TestConfig = {
  temperature: 0.1,
  maxTokens: 1500,
  maxRetries: 3,
  runsPerScenario: 10,
};

/**
 * Parse validation errors from ZodError
 */
function parseZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((e) => ({
    path: e.path.map(String),
    message: e.message,
    code: e.code,
  }));
}

/**
 * Run a single attempt with generateText (non-strict mode)
 */
async function runNonStrictAttempt<T>(
  model: ModelConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  schema: ZodSchema<T>,
  config: TestConfig
): Promise<{ success: boolean; data?: T; raw: string; errors?: ValidationError[]; tokens?: { input: number; output: number } }> {
  const result = await generateText({
    model: model.model,
    messages,
    temperature: config.temperature,
    maxOutputTokens: config.maxTokens,
  });

  const raw = result.text;
  const cleaned = extractJson(raw);

  try {
    const parsed = JSON.parse(cleaned);
    const validated = schema.parse(parsed);
    return {
      success: true,
      data: validated,
      raw,
      tokens: {
        input: result.usage?.inputTokens || 0,
        output: result.usage?.outputTokens || 0,
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        raw,
        errors: parseZodErrors(error),
        tokens: {
          input: result.usage?.inputTokens || 0,
          output: result.usage?.outputTokens || 0,
        },
      };
    }
    if (error instanceof SyntaxError) {
      return {
        success: false,
        raw,
        errors: [{ path: [], message: `Invalid JSON: ${error.message}`, code: 'invalid_json' }],
        tokens: {
          input: result.usage?.inputTokens || 0,
          output: result.usage?.outputTokens || 0,
        },
      };
    }
    throw error;
  }
}

/**
 * Run a single attempt with generateObject (strict mode)
 */
async function runStrictAttempt<T>(
  model: ModelConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  schema: ZodSchema<T>,
  config: TestConfig
): Promise<{ success: boolean; data?: T; raw: string; errors?: ValidationError[]; tokens?: { input: number; output: number } }> {
  try {
    const result = await generateObject({
      model: model.model,
      messages,
      schema,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    });

    return {
      success: true,
      data: result.object as T,
      raw: JSON.stringify(result.object, null, 2),
      tokens: {
        input: result.usage?.inputTokens || 0,
        output: result.usage?.outputTokens || 0,
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        raw: '',
        errors: parseZodErrors(error),
      };
    }
    // Handle AI SDK errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      raw: '',
      errors: [{ path: [], message: errorMessage, code: 'api_error' }],
    };
  }
}

/**
 * Run Scenario 1: One-shot, non-strict
 */
async function runScenario1(
  model: ModelConfig,
  config: TestConfig,
  onProgress?: ProgressCallback
): Promise<RunResult[]> {
  const runs: RunResult[] = [];
  const conversationText = formatConversation();

  for (let runNum = 1; runNum <= config.runsPerScenario; runNum++) {
    const attempts: AttemptResult[] = [];
    let success = false;
    let finalResponse: Record<string, unknown> | null = null;
    const runStartTime = Date.now();

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      const attemptStartTime = Date.now();

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is a conversation between team members:\n\n${conversationText}` },
        { role: 'user', content: getOneShotPrompt() },
      ];

      // Add retry context if not first attempt
      if (attempt > 1 && attempts.length > 0) {
        const lastAttempt = attempts[attempts.length - 1];
        messages.push({
          role: 'assistant',
          content: lastAttempt.rawResponse,
        });
        messages.push({
          role: 'user',
          content: getRetryPrompt(lastAttempt.rawResponse, lastAttempt.validationErrors),
        });
      }

      const promptText = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
      onProgress?.({
        modelId: model.id,
        modelName: model.name,
        scenario: 1,
        runNumber: runNum,
        attemptNumber: attempt,
        status: attempt === 1 ? 'running' : 'retrying',
        logEntry: {
          timestamp: new Date().toISOString(),
          modelId: model.id,
          modelName: model.name,
          scenario: 1,
          runNumber: runNum,
          attemptNumber: attempt,
          type: 'request',
          prompt: promptText,
        },
      });

      const result = await runNonStrictAttempt(model, messages, ResponseSchema, config);
      const attemptDuration = Date.now() - attemptStartTime;

      const attemptResult: AttemptResult = {
        attemptNumber: attempt,
        timestamp: new Date().toISOString(),
        success: result.success,
        durationMs: attemptDuration,
        inputTokens: result.tokens?.input,
        outputTokens: result.tokens?.output,
        prompt: promptText,
        rawResponse: result.raw,
        parsedResponse: result.success ? (result.data as Record<string, unknown>) : null,
        validationErrors: result.errors || [],
        errorMessage: null,
      };

      attempts.push(attemptResult);

      onProgress?.({
        modelId: model.id,
        modelName: model.name,
        scenario: 1,
        runNumber: runNum,
        attemptNumber: attempt,
        status: result.success ? 'success' : 'failed',
        message: result.errors?.[0]?.message,
        logEntry: {
          timestamp: new Date().toISOString(),
          modelId: model.id,
          modelName: model.name,
          scenario: 1,
          runNumber: runNum,
          attemptNumber: attempt,
          type: 'response',
          response: result.raw,
          validationResult: {
            success: result.success,
            errors: result.errors,
          },
        },
      });

      if (result.success) {
        success = true;
        finalResponse = result.data as Record<string, unknown>;
        break;
      }
    }

    runs.push({
      runNumber: runNum,
      success,
      attempts,
      totalDurationMs: Date.now() - runStartTime,
      finalResponse,
    });
  }

  return runs;
}

/**
 * Run Scenario 2: One-shot, strict
 */
async function runScenario2(
  model: ModelConfig,
  config: TestConfig,
  onProgress?: ProgressCallback
): Promise<RunResult[]> {
  const runs: RunResult[] = [];
  const conversationText = formatConversation();

  for (let runNum = 1; runNum <= config.runsPerScenario; runNum++) {
    const attempts: AttemptResult[] = [];
    let success = false;
    let finalResponse: Record<string, unknown> | null = null;
    const runStartTime = Date.now();

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      const attemptStartTime = Date.now();

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is a conversation between team members:\n\n${conversationText}` },
        { role: 'user', content: oneShotStrictPrompt },
      ];

      const promptText = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
      onProgress?.({
        modelId: model.id,
        modelName: model.name,
        scenario: 2,
        runNumber: runNum,
        attemptNumber: attempt,
        status: attempt === 1 ? 'running' : 'retrying',
        logEntry: {
          timestamp: new Date().toISOString(),
          modelId: model.id,
          modelName: model.name,
          scenario: 2,
          runNumber: runNum,
          attemptNumber: attempt,
          type: 'request',
          prompt: promptText,
        },
      });

      const result = await runStrictAttempt(model, messages, ResponseSchema, config);
      const attemptDuration = Date.now() - attemptStartTime;

      const attemptResult: AttemptResult = {
        attemptNumber: attempt,
        timestamp: new Date().toISOString(),
        success: result.success,
        durationMs: attemptDuration,
        inputTokens: result.tokens?.input,
        outputTokens: result.tokens?.output,
        prompt: promptText,
        rawResponse: result.raw,
        parsedResponse: result.success ? (result.data as Record<string, unknown>) : null,
        validationErrors: result.errors || [],
        errorMessage: null,
      };

      attempts.push(attemptResult);

      onProgress?.({
        modelId: model.id,
        modelName: model.name,
        scenario: 2,
        runNumber: runNum,
        attemptNumber: attempt,
        status: result.success ? 'success' : 'failed',
        message: result.errors?.[0]?.message,
        logEntry: {
          timestamp: new Date().toISOString(),
          modelId: model.id,
          modelName: model.name,
          scenario: 2,
          runNumber: runNum,
          attemptNumber: attempt,
          type: 'response',
          response: result.raw,
          validationResult: {
            success: result.success,
            errors: result.errors,
          },
        },
      });

      if (result.success) {
        success = true;
        finalResponse = result.data as Record<string, unknown>;
        break;
      }
    }

    runs.push({
      runNumber: runNum,
      success,
      attempts,
      totalDurationMs: Date.now() - runStartTime,
      finalResponse,
    });
  }

  return runs;
}

/**
 * Run Scenario 3: Sequential, non-strict
 */
async function runScenario3(
  model: ModelConfig,
  config: TestConfig,
  onProgress?: ProgressCallback
): Promise<RunResult[]> {
  const runs: RunResult[] = [];
  const conversationText = formatConversation();

  for (let runNum = 1; runNum <= config.runsPerScenario; runNum++) {
    const attempts: AttemptResult[] = [];
    let success = false;
    let finalResponse: Record<string, unknown> | null = null;
    const runStartTime = Date.now();

    onProgress?.({
      modelId: model.id,
      modelName: model.name,
      scenario: 3,
      runNumber: runNum,
      attemptNumber: 1,
      status: 'running',
    });

    try {
      // Step 1
      let step1Result: SequentialPart1 | null = null;
      let step1Messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is a conversation between team members:\n\n${conversationText}` },
        { role: 'user', content: sequentialPrompts.step1.nonStrict },
      ];

      for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        const attemptStartTime = Date.now();
        const promptText = step1Messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
        const result = await runNonStrictAttempt(model, step1Messages, SequentialPart1Schema, config);

        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          success: result.success,
          durationMs: Date.now() - attemptStartTime,
          inputTokens: result.tokens?.input,
          outputTokens: result.tokens?.output,
          prompt: promptText,
          rawResponse: result.raw,
          parsedResponse: result.success ? (result.data as Record<string, unknown>) : null,
          validationErrors: result.errors || [],
          errorMessage: null,
        });

        if (result.success) {
          step1Result = result.data as SequentialPart1;
          break;
        }

        // Add retry context
        step1Messages = [
          ...step1Messages,
          { role: 'assistant' as const, content: result.raw },
          { role: 'user' as const, content: getRetryPrompt(result.raw, result.errors || []) },
        ];
      }

      if (!step1Result) throw new Error('Step 1 failed');

      // Step 2
      let step2Result: SequentialPart2 | null = null;
      let step2Messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is a conversation between team members:\n\n${conversationText}` },
        { role: 'assistant', content: JSON.stringify(step1Result) },
        { role: 'user', content: sequentialPrompts.step2.nonStrict },
      ];

      for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        const attemptStartTime = Date.now();
        const promptText = step2Messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
        const result = await runNonStrictAttempt(model, step2Messages, SequentialPart2Schema, config);

        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          success: result.success,
          durationMs: Date.now() - attemptStartTime,
          inputTokens: result.tokens?.input,
          outputTokens: result.tokens?.output,
          prompt: promptText,
          rawResponse: result.raw,
          parsedResponse: result.success ? (result.data as Record<string, unknown>) : null,
          validationErrors: result.errors || [],
          errorMessage: null,
        });

        if (result.success) {
          step2Result = result.data as SequentialPart2;
          break;
        }

        step2Messages = [
          ...step2Messages,
          { role: 'assistant' as const, content: result.raw },
          { role: 'user' as const, content: getRetryPrompt(result.raw, result.errors || []) },
        ];
      }

      if (!step2Result) throw new Error('Step 2 failed');

      // Step 3
      let step3Result: SequentialPart3 | null = null;
      let step3Messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is a conversation between team members:\n\n${conversationText}` },
        { role: 'assistant', content: JSON.stringify(step1Result) },
        { role: 'assistant', content: JSON.stringify(step2Result) },
        { role: 'user', content: sequentialPrompts.step3.nonStrict },
      ];

      for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        const attemptStartTime = Date.now();
        const promptText = step3Messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
        const result = await runNonStrictAttempt(model, step3Messages, SequentialPart3Schema, config);

        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          success: result.success,
          durationMs: Date.now() - attemptStartTime,
          inputTokens: result.tokens?.input,
          outputTokens: result.tokens?.output,
          prompt: promptText,
          rawResponse: result.raw,
          parsedResponse: result.success ? (result.data as Record<string, unknown>) : null,
          validationErrors: result.errors || [],
          errorMessage: null,
        });

        if (result.success) {
          step3Result = result.data as SequentialPart3;
          break;
        }

        step3Messages = [
          ...step3Messages,
          { role: 'assistant' as const, content: result.raw },
          { role: 'user' as const, content: getRetryPrompt(result.raw, result.errors || []) },
        ];
      }

      if (!step3Result) throw new Error('Step 3 failed');

      // Merge and validate final result
      const merged = mergeSequentialParts(step1Result, step2Result, step3Result);
      ResponseSchema.parse(merged);
      
      success = true;
      finalResponse = merged as unknown as Record<string, unknown>;

      onProgress?.({
        modelId: model.id,
        modelName: model.name,
        scenario: 3,
        runNumber: runNum,
        attemptNumber: attempts.length,
        status: 'success',
      });
    } catch (error) {
      onProgress?.({
        modelId: model.id,
        modelName: model.name,
        scenario: 3,
        runNumber: runNum,
        attemptNumber: attempts.length,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    runs.push({
      runNumber: runNum,
      success,
      attempts,
      totalDurationMs: Date.now() - runStartTime,
      finalResponse,
    });
  }

  return runs;
}

/**
 * Run Scenario 4: Sequential, strict
 */
async function runScenario4(
  model: ModelConfig,
  config: TestConfig,
  onProgress?: ProgressCallback
): Promise<RunResult[]> {
  const runs: RunResult[] = [];
  const conversationText = formatConversation();

  for (let runNum = 1; runNum <= config.runsPerScenario; runNum++) {
    const attempts: AttemptResult[] = [];
    let success = false;
    let finalResponse: Record<string, unknown> | null = null;
    const runStartTime = Date.now();

    onProgress?.({
      modelId: model.id,
      modelName: model.name,
      scenario: 4,
      runNumber: runNum,
      attemptNumber: 1,
      status: 'running',
    });

    try {
      // Step 1
      let step1Result: SequentialPart1 | null = null;
      const step1Messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is a conversation between team members:\n\n${conversationText}` },
        { role: 'user', content: sequentialPrompts.step1.strict },
      ];

      for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        const attemptStartTime = Date.now();
        const promptText = step1Messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
        const result = await runStrictAttempt(model, step1Messages, SequentialPart1Schema, config);

        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          success: result.success,
          durationMs: Date.now() - attemptStartTime,
          inputTokens: result.tokens?.input,
          outputTokens: result.tokens?.output,
          prompt: promptText,
          rawResponse: result.raw,
          parsedResponse: result.success ? (result.data as Record<string, unknown>) : null,
          validationErrors: result.errors || [],
          errorMessage: null,
        });

        if (result.success) {
          step1Result = result.data as SequentialPart1;
          break;
        }
      }

      if (!step1Result) throw new Error('Step 1 failed');

      // Step 2
      let step2Result: SequentialPart2 | null = null;
      const step2Messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is a conversation between team members:\n\n${conversationText}` },
        { role: 'assistant', content: JSON.stringify(step1Result) },
        { role: 'user', content: sequentialPrompts.step2.strict },
      ];

      for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        const attemptStartTime = Date.now();
        const promptText = step2Messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
        const result = await runStrictAttempt(model, step2Messages, SequentialPart2Schema, config);

        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          success: result.success,
          durationMs: Date.now() - attemptStartTime,
          inputTokens: result.tokens?.input,
          outputTokens: result.tokens?.output,
          prompt: promptText,
          rawResponse: result.raw,
          parsedResponse: result.success ? (result.data as Record<string, unknown>) : null,
          validationErrors: result.errors || [],
          errorMessage: null,
        });

        if (result.success) {
          step2Result = result.data as SequentialPart2;
          break;
        }
      }

      if (!step2Result) throw new Error('Step 2 failed');

      // Step 3
      let step3Result: SequentialPart3 | null = null;
      const step3Messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is a conversation between team members:\n\n${conversationText}` },
        { role: 'assistant', content: JSON.stringify(step1Result) },
        { role: 'assistant', content: JSON.stringify(step2Result) },
        { role: 'user', content: sequentialPrompts.step3.strict },
      ];

      for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        const attemptStartTime = Date.now();
        const promptText = step3Messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
        const result = await runStrictAttempt(model, step3Messages, SequentialPart3Schema, config);

        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          success: result.success,
          durationMs: Date.now() - attemptStartTime,
          inputTokens: result.tokens?.input,
          outputTokens: result.tokens?.output,
          prompt: promptText,
          rawResponse: result.raw,
          parsedResponse: result.success ? (result.data as Record<string, unknown>) : null,
          validationErrors: result.errors || [],
          errorMessage: null,
        });

        if (result.success) {
          step3Result = result.data as SequentialPart3;
          break;
        }
      }

      if (!step3Result) throw new Error('Step 3 failed');

      // Merge and validate final result
      const merged = mergeSequentialParts(step1Result, step2Result, step3Result);
      ResponseSchema.parse(merged);
      
      success = true;
      finalResponse = merged as unknown as Record<string, unknown>;

      onProgress?.({
        modelId: model.id,
        modelName: model.name,
        scenario: 4,
        runNumber: runNum,
        attemptNumber: attempts.length,
        status: 'success',
      });
    } catch (error) {
      onProgress?.({
        modelId: model.id,
        modelName: model.name,
        scenario: 4,
        runNumber: runNum,
        attemptNumber: attempts.length,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    runs.push({
      runNumber: runNum,
      success,
      attempts,
      totalDurationMs: Date.now() - runStartTime,
      finalResponse,
    });
  }

  return runs;
}

/**
 * Run all scenarios for a single model
 */
export async function runModelTests(
  modelId: string,
  scenarios: number[],
  config: TestConfig = DEFAULT_CONFIG,
  onProgress?: ProgressCallback
): Promise<{ [scenario: string]: ScenarioResult }> {
  const model = getModel(modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  const results: { [scenario: string]: ScenarioResult } = {};

  for (const scenario of scenarios) {
    let runs: RunResult[];

    switch (scenario) {
      case 1:
        runs = await runScenario1(model, config, onProgress);
        break;
      case 2:
        runs = await runScenario2(model, config, onProgress);
        break;
      case 3:
        runs = await runScenario3(model, config, onProgress);
        break;
      case 4:
        runs = await runScenario4(model, config, onProgress);
        break;
      default:
        throw new Error(`Invalid scenario: ${scenario}`);
    }

    results[scenario.toString()] = {
      runs,
      summary: calculateScenarioSummary(runs),
    };
  }

  return results;
}

/**
 * Run full test suite
 */
export async function runFullTestSuite(
  modelIds: string[],
  scenarios: number[],
  config: TestConfig = DEFAULT_CONFIG,
  onProgress?: ProgressCallback
): Promise<TestRunFile['results']> {
  const results: TestRunFile['results'] = {};

  for (const modelId of modelIds) {
    results[modelId] = await runModelTests(modelId, scenarios, config, onProgress);
  }

  return results;
}
