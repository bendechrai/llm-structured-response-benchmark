import Link from 'next/link';
import { Card, Button, ScenarioBadge } from '@/components/ui';
import { conversation, participants } from '@/lib/conversation';

function ChatMessage({ participant, message, role }: { participant: string; message: string; role: string }) {
  const colors: Record<string, string> = {
    Alex: 'bg-blue-500',
    Jordan: 'bg-green-500',
    Sam: 'bg-purple-500',
    Casey: 'bg-orange-500',
    Morgan: 'bg-pink-500',
  };

  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-full ${colors[participant] || 'bg-gray-500'} flex items-center justify-center text-white text-sm font-medium shrink-0`}>
        {participant[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{participant}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{role}</span>
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm mt-0.5">{message}</p>
      </div>
    </div>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {title && (
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs font-mono text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          {title}
        </div>
      )}
      <pre className="bg-gray-50 dark:bg-gray-900 p-4 overflow-x-auto text-sm">
        <code className="text-gray-800 dark:text-gray-200">{children}</code>
      </pre>
    </div>
  );
}

function FlowStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">
        {number}
      </div>
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const participantMap = Object.fromEntries(participants.map(p => [p.name, p]));

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          LLM Structured Output Benchmark
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Testing how well different language models adhere to specific JSON response formats
          across various prompting strategies.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button size="lg">View Results</Button>
          </Link>
          <Link href="/run">
            <Button size="lg" variant="secondary">Run Benchmark</Button>
          </Link>
        </div>
      </div>

      {/* Models Tested */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Models Tested
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10a37f]"></span>
              OpenAI
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>GPT-5</li>
              <li>GPT-4o</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#d97706]"></span>
              Anthropic
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Claude Sonnet 4.5</li>
              <li>Claude Opus 4.5</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4285f4]"></span>
              Google
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Gemini 2.5 Flash</li>
              <li>Gemini 3 Pro</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f55036]"></span>
              Groq
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>GPT-OSS 120B</li>
              <li>Kimi K2</li>
              <li>Llama 3.3 70B</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#6366f1]"></span>
              OpenRouter
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Qwen3 235B</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* The Task */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          The Task
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The LLM is given a team conversation discussing a technical problem. It must analyze
          the conversation and recommend a new team member who could help solve their problem,
          returning a structured JSON response.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">The Conversation</h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto space-y-4 mb-6">
          {conversation.map((msg, idx) => {
            const p = participantMap[msg.participant];
            return (
              <ChatMessage
                key={idx}
                participant={msg.participant}
                message={msg.message}
                role={p?.role || ''}
              />
            );
          })}
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Expected Output Schema</h3>
        <CodeBlock title="ResponseSchema (Zod)">{`z.object({
  recommendation: z.string()
    .min(20)
    .describe('Explanation of the hiring recommendation'),

  action: z.object({
    type: z.literal('create_actor'),
    actor: z.object({
      title: z.string().min(2),        // e.g., "Database Administrator"
      reason: z.string().min(20),      // Why this role is needed
      skills: z.array(z.string()),     // Required technical skills
      prompt: z.string().min(30),      // System prompt for AI assistant
      model: z.enum(['reasoning', 'semantic']),
    }),
  }).nullable(),
})`}</CodeBlock>
      </Card>

      {/* Test Scenarios */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Test Scenarios
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Each model is tested across 4 different scenarios to compare prompting strategies:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ScenarioBadge scenario={1} />
              <h3 className="font-semibold text-gray-900 dark:text-white">One-shot, Non-strict</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Single request with JSON schema embedded in the prompt. Uses <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">generateText()</code> and
              parses the response manually.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tests: Natural language instruction following
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ScenarioBadge scenario={2} />
              <h3 className="font-semibold text-gray-900 dark:text-white">One-shot, Strict</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Single request using <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">generateObject()</code> with
              the Zod schema. The API enforces the schema structure.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tests: API-enforced structured output
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ScenarioBadge scenario={3} />
              <h3 className="font-semibold text-gray-900 dark:text-white">Sequential, Non-strict</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Three sequential requests, each building on the previous. Uses <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">generateText()</code> with
              JSON schema in prompts.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Step 1: Recommendation → Step 2: Details → Step 3: AI Config
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ScenarioBadge scenario={4} />
              <h3 className="font-semibold text-gray-900 dark:text-white">Sequential, Strict</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Three sequential requests using <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">generateObject()</code> for
              each step with smaller schemas.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Step 1: Recommendation → Step 2: Details → Step 3: AI Config
            </div>
          </div>
        </div>
      </Card>

      {/* Retry Logic */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Retry Logic
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          When a response fails validation, the system retries with context about what went wrong.
          Each run allows up to 3 retries (4 total attempts).
        </p>

        <div className="space-y-4">
          <FlowStep
            number={1}
            title="Initial Request"
            description="Send the conversation and prompt to the LLM, requesting a structured JSON response."
          />
          <FlowStep
            number={2}
            title="Validation"
            description="Parse the response and validate against the Zod schema. Check for JSON syntax errors and schema violations."
          />
          <FlowStep
            number={3}
            title="Retry with Context"
            description="If validation fails, send a retry prompt that includes the previous response and specific error messages."
          />
          <FlowStep
            number={4}
            title="Record Result"
            description="Track success/failure, attempt count, duration, and token usage for analysis."
          />
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-6 mb-3">Retry Prompt Example</h3>
        <CodeBlock>{`Your previous response failed JSON validation:

<previous_response>
{"recommendation": "I think you need...", "action": {...}}
</previous_response>

<validation_errors>
• action.actor.skills: Array must contain at least 3 items
• action.actor.prompt: String must contain at least 30 characters
</validation_errors>

Please provide a corrected JSON response.`}</CodeBlock>
      </Card>

      {/* Sequential Flow */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Sequential Mode Flow
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          In sequential mode, the response is built across 3 separate LLM calls. Each step has its
          own smaller schema and can retry independently.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
            <div className="text-blue-600 dark:text-blue-400 font-semibold mb-2">Step 1: Recommendation</div>
            <CodeBlock>{`{
  "recommendation": "I think you need to hire...",
  "action": "create_actor"
}`}</CodeBlock>
          </div>

          <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
            <div className="text-green-600 dark:text-green-400 font-semibold mb-2">Step 2: Details</div>
            <CodeBlock>{`{
  "title": "Senior DBA",
  "reason": "The team needs...",
  "skills": ["PostgreSQL", "Query Optimization", ...]
}`}</CodeBlock>
          </div>

          <div className="border-2 border-purple-500 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
            <div className="text-purple-600 dark:text-purple-400 font-semibold mb-2">Step 3: AI Config</div>
            <CodeBlock>{`{
  "prompt": "You are an expert database...",
  "model": "reasoning"
}`}</CodeBlock>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          The three parts are merged into the final response schema after all steps complete successfully.
        </p>
      </Card>

      {/* Metrics */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Metrics Tracked
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">Success Rate</div>
            <div className="text-sm text-gray-500">% of runs that pass validation</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">First Attempt</div>
            <div className="text-sm text-gray-500">% succeeding without retries</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">Avg Time</div>
            <div className="text-sm text-gray-500">Seconds per successful run</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">Cost</div>
            <div className="text-sm text-gray-500">Estimated cost per run</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">Token Usage</div>
            <div className="text-sm text-gray-500">Input + output tokens per run</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">Retry Breakdown</div>
            <div className="text-sm text-gray-500">Success after 1, 2, 3 retries</div>
          </div>
        </div>
      </Card>

      {/* CTA */}
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Ready to run the benchmark?
        </h2>
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button size="lg">View Results</Button>
          </Link>
          <Link href="/run">
            <Button size="lg" variant="secondary">Run Benchmark</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
