import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadTestRun } from '@/lib/storage';
import { models } from '@/lib/models';
import { Card, SuccessRate, ProviderBadge, Button, ScenarioBadge } from '@/components/ui';
import { ResultsActivityLog } from '@/components/ResultsActivityLog';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const run = loadTestRun(id);

  if (!run) {
    notFound();
  }

  const scenarioNames: Record<number, string> = {
    1: 'One-shot, Non-strict',
    2: 'One-shot, Strict',
    3: 'Sequential, Non-strict',
    4: 'Sequential, Strict',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Test Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {new Date(run.timestamp).toLocaleString()} • {run.duration ? `${(run.duration / 1000).toFixed(1)}s` : 'N/A'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/run">
            <Button variant="secondary">Run Again</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tests</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {run.summary.totalTests}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Passed</p>
            <p className="text-2xl font-bold text-green-600">
              {run.summary.passed}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {run.summary.failed}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
            <SuccessRate value={run.summary.successRate} showLabel={false} />
          </div>
        </div>
      </Card>

      {Object.entries(run.results).map(([modelId, modelResults]) => {
        const model = models.find((m) => m.id === modelId);
        if (!model) return null;

        return (
          <Card key={modelId} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <ProviderBadge provider={model.provider} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {model.name}
              </h2>
            </div>

            <div className="space-y-6">
              {Object.entries(modelResults).map(([scenario, result]) => {
                const scenarioNum = parseInt(scenario);
                const successCount = result.runs.filter((r) => r.success).length;
                const totalRuns = result.runs.length;

                return (
                  <div key={scenario} className="border-t border-gray-200 dark:border-gray-700 pt-4 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <ScenarioBadge scenario={scenarioNum} />
                        <span className="text-gray-700 dark:text-gray-300">
                          {scenarioNames[scenarioNum]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {successCount}/{totalRuns} passed
                        </span>
                        <SuccessRate value={result.summary.successRate} showLabel={false} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">First attempt:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {result.summary.firstAttemptSuccessRate.toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">After 1 retry:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {result.summary.afterRetry1SuccessRate.toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Avg attempts:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {result.summary.averageAttempts.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Tokens:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {result.summary.totalTokensUsed.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-0.5">
                      {result.runs.map((runResult, runIdx) => {
                        const maxAttempts = run.config.maxRetries + 1;
                        return (
                          <div key={runIdx} className="flex-1 flex gap-px">
                            {Array.from({ length: maxAttempts }, (_, attemptIdx) => {
                              const attempt = runResult.attempts[attemptIdx];
                              let color = 'bg-gray-300 dark:bg-gray-600';

                              if (attempt) {
                                if (attempt.success) {
                                  color = 'bg-green-500';
                                } else {
                                  color = 'bg-red-500';
                                }
                              } else if (runResult.success && attemptIdx > runResult.attempts.length - 1) {
                                color = 'bg-gray-300 dark:bg-gray-600';
                              }

                              return (
                                <div
                                  key={attemptIdx}
                                  className={`h-6 flex-1 ${color} ${attemptIdx === 0 ? 'rounded-l' : ''} ${attemptIdx === maxAttempts - 1 ? 'rounded-r' : ''}`}
                                  title={`Run ${runIdx + 1}, Attempt ${attemptIdx + 1}: ${attempt ? (attempt.success ? 'Success' : 'Failed') : 'Skipped'}`}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configuration
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Models:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {run.config.models.length}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Scenarios:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {run.config.scenarios.join(', ')}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Runs/scenario:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {run.config.runsPerScenario}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Temperature:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {run.config.temperature}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Activity Log
        </h2>
        <ResultsActivityLog
          results={run.results}
          models={models.map((m) => ({ id: m.id, name: m.name }))}
        />
      </Card>
    </div>
  );
}