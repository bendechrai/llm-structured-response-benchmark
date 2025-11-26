'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, ProviderBadge, ScenarioBadge, SuccessRate } from '@/components/ui';
import { ActivityLog } from '@/components/ActivityLog';

interface Model {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  providerName: string;
}

type AttemptStatus = 'pending' | 'running' | 'failed' | 'success' | 'skipped';

interface RunAttempts {
  run: number;
  attempts: AttemptStatus[];
  final: 'pending' | 'success' | 'failed';
}

interface LogEntry {
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

interface RunProgress {
  currentModel: string;
  currentScenario: number;
  currentRun: number;
  currentAttempt: number;
  runs: RunAttempts[];
  totalRuns: number;
  completedRuns: number;
  maxAttempts: number;
  logEntries: LogEntry[];
}

interface RunStatus {
  id: string;
  status: 'running' | 'complete' | 'cancelled' | 'error';
  progress: RunProgress;
  error?: string;
  summary?: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}

const scenarios = [
  { id: 1, name: 'One-shot, Non-strict', description: 'Single request with JSON format in prompt' },
  { id: 2, name: 'One-shot, Strict', description: 'Single request with generateObject' },
  { id: 3, name: 'Sequential, Non-strict', description: 'Multi-step with JSON format in prompt' },
  { id: 4, name: 'Sequential, Strict', description: 'Multi-step with generateObject' },
];

export default function RunTestsPage() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [selectedScenarios, setSelectedScenarios] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [runsPerScenario, setRunsPerScenario] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available models
  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models);
        // Select all models by default
        setSelectedModels(new Set(data.models.map((m: Model) => m.id)));
      })
      .catch((err) => {
        setError('Failed to load models');
        console.error(err);
      });
  }, []);

  // Poll for run status
  useEffect(() => {
    if (!runId || !isRunning) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/run/${runId}`);
        const status: RunStatus = await res.json();
        setRunStatus(status);

        if (status.status === 'complete') {
          setIsRunning(false);
          // Navigate to results after a short delay
          setTimeout(() => {
            router.push(`/results/${runId}`);
          }, 1500);
        } else if (status.status === 'error' || status.status === 'cancelled') {
          setIsRunning(false);
          if (status.error) {
            setError(status.error);
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [runId, isRunning, router]);

  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  }, []);

  const toggleScenario = useCallback((scenarioId: number) => {
    setSelectedScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
      } else {
        next.add(scenarioId);
      }
      return next;
    });
  }, []);

  const selectAllModels = useCallback(() => {
    setSelectedModels(new Set(models.map((m) => m.id)));
  }, [models]);

  const deselectAllModels = useCallback(() => {
    setSelectedModels(new Set());
  }, []);

  const startRun = async () => {
    if (selectedModels.size === 0 || selectedScenarios.size === 0) {
      setError('Please select at least one model and one scenario');
      return;
    }

    setError(null);
    setIsRunning(true);
    setRunStatus(null);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: Array.from(selectedModels),
          scenarios: Array.from(selectedScenarios),
          runsPerScenario,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to start test run');
      }

      const data = await res.json();
      setRunId(data.runId);
    } catch (err) {
      setIsRunning(false);
      setError(err instanceof Error ? err.message : 'Failed to start test run');
    }
  };

  const cancelRun = async () => {
    if (!runId) return;

    try {
      await fetch(`/api/run/${runId}`, { method: 'DELETE' });
      setIsRunning(false);
    } catch (err) {
      console.error('Error cancelling run:', err);
    }
  };

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  const totalTests = selectedModels.size * selectedScenarios.size * runsPerScenario;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Run Tests
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure and run structured output benchmarks
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Progress Display */}
      {isRunning && runStatus && runStatus.progress?.runs && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Running Tests...
              </h2>
              <Button variant="danger" onClick={cancelRun}>
                Cancel
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>
                  {runStatus.progress.currentModel} • Scenario {runStatus.progress.currentScenario}
                </span>
                <span>
                  {runStatus.progress.completedRuns} / {runStatus.progress.totalRuns} runs complete
                </span>
              </div>

              {/* Segmented progress bar */}
              <div className="flex gap-0.5">
                {runStatus.progress.runs.map((run) => (
                  <div key={run.run} className="flex-1 flex gap-px">
                    {run.attempts.map((attempt, attemptIdx) => {
                      const colors: Record<AttemptStatus, string> = {
                        pending: 'bg-gray-200 dark:bg-gray-700',
                        running: 'bg-blue-500 animate-pulse',
                        failed: 'bg-red-500',
                        success: 'bg-green-500',
                        skipped: 'bg-gray-300 dark:bg-gray-600',
                      };
                      return (
                        <div
                          key={attemptIdx}
                          className={`h-6 flex-1 ${colors[attempt]} ${attemptIdx === 0 ? 'rounded-l' : ''} ${attemptIdx === runStatus.progress.maxAttempts - 1 ? 'rounded-r' : ''}`}
                          title={`Run ${run.run}, Attempt ${attemptIdx + 1}: ${attempt}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Success</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span>Failed attempt</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>Running</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
                  <span>Skipped</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                  <span>Pending</span>
                </div>
              </div>

              {/* Current activity */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Run {runStatus.progress.currentRun}, Attempt {runStatus.progress.currentAttempt}
              </div>
            </div>

            {runStatus.status === 'complete' && runStatus.summary && (
              <div className="flex items-center gap-4 pt-2">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ✓ Complete!
                </span>
                <SuccessRate value={runStatus.summary.successRate} />
                <span className="text-gray-500 text-sm">
                  Redirecting to results...
                </span>
              </div>
            )}

            {/* Activity Log */}
            <div className="mt-4">
              <ActivityLog
                entries={runStatus.progress.logEntries || []}
                modelName={runStatus.progress.currentModel}
                scenario={runStatus.progress.currentScenario}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Configuration */}
      {!isRunning && (
        <>
          {/* Models Selection */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Models
              </h2>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={selectAllModels}>
                  Select All
                </Button>
                <Button variant="secondary" size="sm" onClick={deselectAllModels}>
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="flex items-center gap-2 mb-3">
                    <ProviderBadge provider={provider as 'openai' | 'anthropic' | 'google'} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {providerModels.map((model) => (
                      <label
                        key={model.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedModels.has(model.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedModels.has(model.id)}
                          onChange={() => toggleModel(model.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {model.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {model.id}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Scenarios Selection */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scenarios
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scenarios.map((scenario) => (
                <label
                  key={scenario.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedScenarios.has(scenario.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedScenarios.has(scenario.id)}
                    onChange={() => toggleScenario(scenario.id)}
                    className="w-4 h-4 mt-1 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <ScenarioBadge scenario={scenario.id} />
                      <p className="font-medium text-gray-900 dark:text-white">
                        {scenario.name}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {scenario.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Configuration Options */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Configuration
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300">Runs per scenario:</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={runsPerScenario}
                  onChange={(e) => setRunsPerScenario(parseInt(e.target.value) || 10)}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </label>
            </div>
          </Card>

          {/* Summary and Run Button */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {totalTests}
                </span>{' '}
                total tests ({selectedModels.size} models × {selectedScenarios.size} scenarios × {runsPerScenario} runs)
              </div>
              <Button
                size="lg"
                onClick={startRun}
                disabled={selectedModels.size === 0 || selectedScenarios.size === 0}
              >
                Start Benchmark
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
