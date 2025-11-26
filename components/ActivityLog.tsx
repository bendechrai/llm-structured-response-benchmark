'use client';

import { useState, useRef, useEffect } from 'react';

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

interface ActivityLogProps {
  entries: LogEntry[];
  modelName?: string;
  scenario?: number;
}

const scenarioNames: Record<number, string> = {
  1: 'One-Shot Non-Strict',
  2: 'One-Shot Strict',
  3: 'Sequential Non-Strict',
  4: 'Sequential Strict',
};

export function ActivityLog({ entries, modelName, scenario }: ActivityLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logRef.current && isExpanded) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries, autoScroll, isExpanded]);

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleTimeString();
  };

  const renderEntry = (entry: LogEntry, index: number) => {
    const header = `=== ${entry.modelName} ${scenarioNames[entry.scenario] || `Scenario ${entry.scenario}`} : Run ${entry.runNumber} : Attempt ${entry.attemptNumber} ===`;

    if (entry.type === 'request') {
      return (
        <div key={`${index}-request`} className="mb-4 font-mono text-xs">
          <div className="text-gray-500 dark:text-gray-400 mb-1">
            [{formatTimestamp(entry.timestamp)}]
          </div>
          <div className="text-blue-600 dark:text-blue-400 font-bold mb-2">
            {header}
          </div>
          <div className="text-gray-700 dark:text-gray-300 mb-1">
            LLM Prompt:
          </div>
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200 max-h-64 overflow-y-auto">
            {entry.prompt}
          </pre>
        </div>
      );
    }

    if (entry.type === 'response') {
      const resultColor = entry.validationResult?.success
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400';

      return (
        <div key={`${index}-response`} className="mb-4 font-mono text-xs">
          <div className="text-gray-500 dark:text-gray-400 mb-1">
            [{formatTimestamp(entry.timestamp)}]
          </div>
          <div className="text-gray-700 dark:text-gray-300 mb-1">
            LLM Response:
          </div>
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200 max-h-64 overflow-y-auto">
            {entry.response || '(empty response)'}
          </pre>
          <div className={`mt-2 font-bold ${resultColor}`}>
            Validation Result: {entry.validationResult?.success ? 'SUCCESS' : 'FAILED'}
          </div>
          {entry.validationResult?.errors && entry.validationResult.errors.length > 0 && (
            <div className="mt-1 text-red-600 dark:text-red-400">
              Errors:
              <ul className="list-disc list-inside ml-2">
                {entry.validationResult.errors.map((err, i) => (
                  <li key={i}>
                    {err.path.length > 0 && <span className="text-gray-500">[{err.path.join('.')}]</span>} {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <hr className="my-4 border-gray-300 dark:border-gray-600" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-300 font-medium">
            Activity Log
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({entries.length} entries)
          </span>
          {modelName && scenario && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              • {modelName} • {scenarioNames[scenario] || `Scenario ${scenario}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 dark:text-gray-500 text-sm">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
          </div>
          <div
            ref={logRef}
            className="p-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-900"
          >
            {entries.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                Waiting for activity...
              </div>
            ) : (
              entries.map((entry, index) => renderEntry(entry, index))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
