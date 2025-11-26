'use client';

import { useState } from 'react';
import { ActivityLog } from './ActivityLog';

interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

interface AttemptResult {
  attemptNumber: number;
  timestamp: string;
  success: boolean;
  prompt: string;
  rawResponse: string;
  validationErrors: ValidationError[];
}

interface RunResult {
  runNumber: number;
  success: boolean;
  attempts: AttemptResult[];
}

interface ScenarioResult {
  runs: RunResult[];
}

interface TestRunResults {
  [modelId: string]: {
    [scenario: string]: ScenarioResult;
  };
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
    errors?: ValidationError[];
  };
}

interface ModelInfo {
  id: string;
  name: string;
}

interface ResultsActivityLogProps {
  results: TestRunResults;
  models: ModelInfo[];
}

function buildLogEntries(
  results: TestRunResults,
  models: ModelInfo[],
  selectedModel: string | null,
  selectedScenario: number | null
): LogEntry[] {
  const entries: LogEntry[] = [];

  for (const [modelId, modelResults] of Object.entries(results)) {
    if (selectedModel && modelId !== selectedModel) continue;

    const model = models.find((m) => m.id === modelId);
    const modelName = model?.name || modelId;

    for (const [scenarioStr, scenarioResult] of Object.entries(modelResults)) {
      const scenario = parseInt(scenarioStr);
      if (selectedScenario && scenario !== selectedScenario) continue;

      for (const run of scenarioResult.runs) {
        for (const attempt of run.attempts) {
          const baseEntry = {
            modelId,
            modelName,
            scenario,
            runNumber: run.runNumber,
            attemptNumber: attempt.attemptNumber,
          };

          if (attempt.prompt) {
            entries.push({
              ...baseEntry,
              timestamp: attempt.timestamp,
              type: 'request',
              prompt: attempt.prompt,
            });
          }

          entries.push({
            ...baseEntry,
            timestamp: attempt.timestamp,
            type: 'response',
            response: attempt.rawResponse,
            validationResult: {
              success: attempt.success,
              errors: attempt.validationErrors,
            },
          });
        }
      }
    }
  }

  entries.sort((a, b) => {
    const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.type === 'request' && b.type === 'response') return -1;
    if (a.type === 'response' && b.type === 'request') return 1;
    return 0;
  });

  return entries;
}

export function ResultsActivityLog({ results, models }: ResultsActivityLogProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  const availableModels = Object.keys(results);
  const availableScenarios = new Set<number>();
  for (const modelResults of Object.values(results)) {
    for (const scenario of Object.keys(modelResults)) {
      availableScenarios.add(parseInt(scenario));
    }
  }

  const entries = buildLogEntries(results, models, selectedModel, selectedScenario);

  const scenarioNames: Record<number, string> = {
    1: 'One-Shot Non-Strict',
    2: 'One-Shot Strict',
    3: 'Sequential Non-Strict',
    4: 'Sequential Strict',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
            Filter by Model
          </label>
          <select
            value={selectedModel || ''}
            onChange={(e) => setSelectedModel(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Models</option>
            {availableModels.map((modelId) => {
              const model = models.find((m) => m.id === modelId);
              return (
                <option key={modelId} value={modelId}>
                  {model?.name || modelId}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
            Filter by Scenario
          </label>
          <select
            value={selectedScenario || ''}
            onChange={(e) => setSelectedScenario(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Scenarios</option>
            {Array.from(availableScenarios)
              .sort()
              .map((s) => (
                <option key={s} value={s}>
                  {scenarioNames[s] || `Scenario ${s}`}
                </option>
              ))}
          </select>
        </div>
      </div>

      <ActivityLog
        entries={entries}
        modelName={selectedModel ? models.find((m) => m.id === selectedModel)?.name : undefined}
        scenario={selectedScenario || undefined}
      />
    </div>
  );
}
