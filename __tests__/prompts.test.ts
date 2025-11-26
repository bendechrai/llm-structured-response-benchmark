import {
  schemaToJsonString,
  systemPrompt,
  getOneShotPrompt,
  oneShotStrictPrompt,
  sequentialPrompts,
  getRetryPrompt,
  extractJson,
} from '../lib/prompts';
import { ResponseSchema } from '../lib/schemas';

describe('Prompt Generation', () => {
  describe('schemaToJsonString', () => {
    it('should convert Zod schema to JSON string', () => {
      const jsonString = schemaToJsonString(ResponseSchema);

      expect(typeof jsonString).toBe('string');

      // Should be valid JSON
      const parsed = JSON.parse(jsonString);
      expect(parsed).toHaveProperty('$schema');
    });

    it('should be a valid JSON string', () => {
      const jsonString = schemaToJsonString(ResponseSchema);

      // Should not throw when parsing
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });
  });

  describe('systemPrompt', () => {
    it('should be a non-empty string', () => {
      expect(typeof systemPrompt).toBe('string');
      expect(systemPrompt.length).toBeGreaterThan(0);
    });

    it('should mention recruiter role', () => {
      expect(systemPrompt).toMatch(/recruiter/i);
    });

    it('should mention team analysis', () => {
      expect(systemPrompt).toMatch(/team/i);
      expect(systemPrompt).toMatch(/recommend/i);
    });
  });

  describe('getOneShotPrompt', () => {
    it('should return a string containing instructions', () => {
      const prompt = getOneShotPrompt();

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include JSON schema', () => {
      const prompt = getOneShotPrompt();

      expect(prompt).toMatch(/JSON/i);
      expect(prompt).toMatch(/schema/i);
    });

    it('should include format instructions', () => {
      const prompt = getOneShotPrompt();

      expect(prompt).toMatch(/return only valid json/i);
      expect(prompt).toMatch(/no markdown/i);
      expect(prompt).toMatch(/backticks/i);
    });
  });

  describe('oneShotStrictPrompt', () => {
    it('should be a non-empty string', () => {
      expect(typeof oneShotStrictPrompt).toBe('string');
      expect(oneShotStrictPrompt.length).toBeGreaterThan(0);
    });

    it('should mention key requirements', () => {
      expect(oneShotStrictPrompt).toMatch(/job title/i);
      expect(oneShotStrictPrompt).toMatch(/skills/i);
      expect(oneShotStrictPrompt).toMatch(/system prompt/i);
    });
  });

  describe('sequentialPrompts', () => {
    it('should have prompts for all three steps', () => {
      expect(sequentialPrompts).toHaveProperty('step1');
      expect(sequentialPrompts).toHaveProperty('step2');
      expect(sequentialPrompts).toHaveProperty('step3');

      expect(sequentialPrompts.step1).toHaveProperty('nonStrict');
      expect(sequentialPrompts.step1).toHaveProperty('strict');
      expect(sequentialPrompts.step2).toHaveProperty('nonStrict');
      expect(sequentialPrompts.step2).toHaveProperty('strict');
      expect(sequentialPrompts.step3).toHaveProperty('nonStrict');
      expect(sequentialPrompts.step3).toHaveProperty('strict');
    });

    it('should have different content for each step', () => {
      const step1Content = sequentialPrompts.step1.nonStrict;
      const step2Content = sequentialPrompts.step2.nonStrict;
      const step3Content = sequentialPrompts.step3.nonStrict;

      expect(step1Content).not.toBe(step2Content);
      expect(step2Content).not.toBe(step3Content);
      expect(step1Content).not.toBe(step3Content);
    });

    it('should reference appropriate content for each step', () => {
      expect(sequentialPrompts.step1.nonStrict).toMatch(/team member/i);
      expect(sequentialPrompts.step2.nonStrict).toMatch(/details/i);
      expect(sequentialPrompts.step2.nonStrict).toMatch(/skills/i);
      expect(sequentialPrompts.step3.nonStrict).toMatch(/system prompt/i);
      expect(sequentialPrompts.step3.nonStrict).toMatch(/model type/i);
    });
  });

  describe('getRetryPrompt', () => {
    const mockValidationErrors = [
      { path: ['recommendation'], message: 'String must contain at least 20 character(s)' },
      { path: ['action', 'actor', 'skills'], message: 'Array must contain at least 3 element(s)' },
    ];

    const mockResponse = '{"recommendation": "Short", "action": null}';

    it('should return a string with retry instructions', () => {
      const retryPrompt = getRetryPrompt(mockResponse, mockValidationErrors);

      expect(typeof retryPrompt).toBe('string');
      expect(retryPrompt.length).toBeGreaterThan(0);
    });

    it('should include the previous response', () => {
      const retryPrompt = getRetryPrompt(mockResponse, mockValidationErrors);

      expect(retryPrompt).toContain(mockResponse);
    });

    it('should include validation errors', () => {
      const retryPrompt = getRetryPrompt(mockResponse, mockValidationErrors);

      expect(retryPrompt).toContain('recommendation');
      expect(retryPrompt).toContain('String must contain at least 20 character(s)');
      expect(retryPrompt).toContain('action.actor.skills');
      expect(retryPrompt).toContain('Array must contain at least 3 element(s)');
    });

    it('should include correction instructions', () => {
      const retryPrompt = getRetryPrompt(mockResponse, mockValidationErrors);

      expect(retryPrompt).toMatch(/corrected/i);
      expect(retryPrompt).toMatch(/valid json/i);
      expect(retryPrompt).toMatch(/validation errors/i);
    });

    it('should handle empty path errors', () => {
      const errors = [{ path: [], message: 'Root level error' }];
      const retryPrompt = getRetryPrompt(mockResponse, errors);

      expect(retryPrompt).toContain('root: Root level error');
    });
  });

  describe('extractJson', () => {
    it('should extract JSON from markdown code blocks', () => {
      const jsonContent = '{"test": "data"}';
      const markdownWrapped = '```json\n' + jsonContent + '\n```';

      const extracted = extractJson(markdownWrapped);
      expect(extracted).toBe(jsonContent);
    });

    it('should extract JSON from generic code blocks', () => {
      const jsonContent = '{"test": "data"}';
      const codeWrapped = '```\n' + jsonContent + '\n```';

      const extracted = extractJson(codeWrapped);
      expect(extracted).toBe(jsonContent);
    });

    it('should return original string if no code blocks', () => {
      const plainJson = '{"test": "data"}';

      const extracted = extractJson(plainJson);
      expect(extracted).toBe(plainJson);
    });

    it('should handle strings with only opening code fence', () => {
      const partialWrapped = '```json\n{"test": "data"}';

      const extracted = extractJson(partialWrapped);
      expect(extracted).toBe('{"test": "data"}');
    });

    it('should handle strings with only closing code fence', () => {
      const partialWrapped = '{"test": "data"}\n```';

      const extracted = extractJson(partialWrapped);
      expect(extracted).toBe('{"test": "data"}');
    });

    it('should trim whitespace', () => {
      const withWhitespace = '  \n  {"test": "data"}  \n  ';

      const extracted = extractJson(withWhitespace);
      expect(extracted).toBe('{"test": "data"}');
    });
  });
});