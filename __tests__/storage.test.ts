import {
  createTestRun,
  calculateScenarioSummary,
  updateRunSummary,
  type TestRunConfig,
  type RunResult,
  type AttemptResult,
} from '../lib/storage';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('Storage Utils', () => {
  describe('createTestRun', () => {
    const mockConfig: TestRunConfig = {
      models: ['openai-gpt4o', 'anthropic-sonnet'],
      scenarios: [1, 2],
      runsPerScenario: 5,
      temperature: 0.1,
      maxRetries: 3,
    };

    it('should create a new test run with valid structure', () => {
      const testRun = createTestRun(mockConfig);

      expect(testRun).toHaveProperty('id');
      expect(testRun).toHaveProperty('timestamp');
      expect(testRun).toHaveProperty('duration');
      expect(testRun).toHaveProperty('config');
      expect(testRun).toHaveProperty('summary');
      expect(testRun).toHaveProperty('results');

      expect(typeof testRun.id).toBe('string');
      expect(testRun.id).toBe('test-uuid-1234');
      expect(new Date(testRun.timestamp)).toBeInstanceOf(Date);
      expect(testRun.duration).toBe(0);
      expect(testRun.config).toEqual(mockConfig);
      expect(testRun.results).toEqual({});
    });

    it('should create initial empty summary', () => {
      const testRun = createTestRun(mockConfig);

      expect(testRun.summary).toEqual({
        totalTests: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
      });
    });
  });

  describe('calculateScenarioSummary', () => {
    const createMockAttempt = (success: boolean, inputTokens = 100, outputTokens = 50): AttemptResult => ({
      attemptNumber: 1,
      timestamp: new Date().toISOString(),
      success,
      durationMs: 1000,
      inputTokens,
      outputTokens,
      prompt: 'mock prompt',
      rawResponse: 'mock response',
      parsedResponse: success ? { test: 'data' } : null,
      validationErrors: [],
      errorMessage: null,
    });

    const createMockRun = (attempts: AttemptResult[]): RunResult => ({
      runNumber: 1,
      success: attempts.some(a => a.success),
      attempts,
      totalDurationMs: 5000,
      finalResponse: attempts.some(a => a.success) ? { test: 'data' } : null,
    });

    it('should handle empty runs', () => {
      const summary = calculateScenarioSummary([]);

      expect(summary).toEqual({
        successRate: 0,
        firstAttemptSuccessRate: 0,
        afterRetry1SuccessRate: 0,
        afterRetry2SuccessRate: 0,
        afterRetry3SuccessRate: 0,
        averageDurationMs: 0,
        averageAttempts: 0,
        totalTokensUsed: 0,
      });
    });

    it('should calculate correct success rates', () => {
      const runs = [
        // First run: success on first attempt
        createMockRun([createMockAttempt(true)]),
        // Second run: success on second attempt
        createMockRun([createMockAttempt(false), createMockAttempt(true)]),
        // Third run: failure on all attempts
        createMockRun([createMockAttempt(false), createMockAttempt(false)]),
        // Fourth run: success on third attempt
        createMockRun([createMockAttempt(false), createMockAttempt(false), createMockAttempt(true)]),
      ];

      const summary = calculateScenarioSummary(runs);

      expect(summary.successRate).toBe(75); // 3/4 successful
      expect(summary.firstAttemptSuccessRate).toBe(25); // 1/4 on first attempt
      expect(summary.afterRetry1SuccessRate).toBe(50); // 2/4 after 1 retry
      expect(summary.afterRetry2SuccessRate).toBe(75); // 3/4 after 2 retries
      expect(summary.afterRetry3SuccessRate).toBe(75); // 3/4 after 3 retries
    });

    it('should calculate token usage correctly', () => {
      const runs = [
        createMockRun([createMockAttempt(true, 100, 50)]),
        createMockRun([createMockAttempt(false, 80, 40), createMockAttempt(true, 120, 60)]),
      ];

      const summary = calculateScenarioSummary(runs);

      // Total tokens: (100+50) + (80+40) + (120+60) = 450
      expect(summary.totalTokensUsed).toBe(450);
    });

    it('should calculate average duration and attempts', () => {
      const runs = [
        createMockRun([createMockAttempt(true)]), // 1 attempt, 5000ms
        createMockRun([createMockAttempt(false), createMockAttempt(true)]), // 2 attempts, 5000ms
      ];

      const summary = calculateScenarioSummary(runs);

      expect(summary.averageDurationMs).toBe(5000);
      expect(summary.averageAttempts).toBe(1.5); // (1+2)/2
    });
  });

  describe('updateRunSummary', () => {
    it('should calculate correct summary from results', () => {
      const testRun = createTestRun({
        models: ['model1'],
        scenarios: [1],
        runsPerScenario: 2,
        temperature: 0.1,
        maxRetries: 3,
      });

      // Add mock results
      testRun.results = {
        model1: {
          '1': {
            runs: [
              createMockRun([createMockAttempt(true)]),
              createMockRun([createMockAttempt(false)]),
            ],
            summary: calculateScenarioSummary([
              createMockRun([createMockAttempt(true)]),
              createMockRun([createMockAttempt(false)]),
            ]),
          },
        },
      };

      updateRunSummary(testRun);

      expect(testRun.summary).toEqual({
        totalTests: 2,
        passed: 1,
        failed: 1,
        successRate: 50,
      });
    });

    it('should handle empty results', () => {
      const testRun = createTestRun({
        models: [],
        scenarios: [],
        runsPerScenario: 0,
        temperature: 0.1,
        maxRetries: 3,
      });

      updateRunSummary(testRun);

      expect(testRun.summary).toEqual({
        totalTests: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
      });
    });
  });

  // Helper function for tests
  const createMockAttempt = (success: boolean, inputTokens = 100, outputTokens = 50): AttemptResult => ({
    attemptNumber: 1,
    timestamp: new Date().toISOString(),
    success,
    durationMs: 1000,
    inputTokens,
    outputTokens,
    prompt: 'mock prompt',
    rawResponse: 'mock response',
    parsedResponse: success ? { test: 'data' } : null,
    validationErrors: [],
    errorMessage: null,
  });

  const createMockRun = (attempts: AttemptResult[]): RunResult => ({
    runNumber: 1,
    success: attempts.some(a => a.success),
    attempts,
    totalDurationMs: 5000,
    finalResponse: attempts.some(a => a.success) ? { test: 'data' } : null,
  });
});