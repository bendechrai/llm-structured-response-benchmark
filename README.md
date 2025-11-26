# LLM Structured Response Benchmark

A comprehensive benchmarking tool that tests how well different Language Models adhere to structured JSON response formats across multiple providers (OpenAI, Anthropic, Google).

## Overview

This tool tests **6 different models** across **4 scenarios** with **10 runs each**, providing detailed insights into:

- **Success rates** for different prompting approaches
- **Retry behavior** and error recovery
- **Provider performance** comparisons
- **Token usage** tracking

### Supported Models

- **OpenAI**: GPT-5, GPT-4o
- **Anthropic**: Claude Sonnet 4.5, Claude Opus 4.1
- **Google**: Gemini 2.5 Flash, Gemini 3 Pro

### Test Scenarios

| Scenario | Approach | Mode | Description |
|----------|----------|------|-------------|
| 1 | One-shot | Non-strict | Single request with format instructions |
| 2 | One-shot | Strict | Single request using AI SDK's `generateObject` |
| 3 | Sequential | Non-strict | Three separate requests building JSON |
| 4 | Sequential | Strict | Three separate requests with `generateObject` |

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- API keys for the providers you want to test

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd llm-structured-response-test
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your API keys:
```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Usage

### Running Tests

1. **Via Dashboard**: Visit the web interface and click "Run Tests"
2. **Configure**: Select models, scenarios, and parameters
3. **Monitor**: Real-time progress tracking
4. **Analyze**: View results with success rates, retry analysis, and comparisons

### API Endpoints

- `POST /api/run` - Start a test run
- `GET /api/run` - List active test runs
- `GET /api/run/[id]` - Get test run status
- `GET /api/results/[id]` - Get detailed results

### Example Configuration

```javascript
{
  models: ["openai-gpt4o", "anthropic-sonnet"],
  scenarios: [1, 2, 3, 4],
  runsPerScenario: 10,
  temperature: 0.1,
  maxRetries: 3
}
```

## Development

### Project Structure

```
├── app/                 # Next.js App Router pages
├── lib/                 # Core business logic
│   ├── models.ts        # Model configurations
│   ├── test-runner.ts   # Test execution engine
│   ├── schemas.ts       # Zod validation schemas
│   ├── storage.ts       # File-based result storage
│   └── prompts.ts       # Prompt templates
├── components/          # React UI components
├── specs/              # Detailed specifications
└── __tests__/          # Test suite
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Running Tests

The project includes comprehensive unit tests:

```bash
npm test                 # Run all tests
npm run test:coverage   # Run with coverage report
```

### Development Commands

```bash
# Type check without compilation
npx tsc --noEmit

# Lint with auto-fix
npm run lint -- --fix

# Build and test
npm run build && npm test
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No* | OpenAI API access |
| `ANTHROPIC_API_KEY` | No* | Anthropic API access |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No* | Google AI API access |

*At least one API key is required to run tests.

### Model Configuration

Models are configured in `lib/models.ts`. Each model includes:

- Provider integration
- Strict mode support
- Display metadata

## Architecture

### Test Execution Flow

1. **Configuration**: Select models and scenarios
2. **Validation**: Verify API keys and model availability
3. **Execution**: Run tests with progress tracking
4. **Storage**: Save results to JSON files
5. **Analysis**: Calculate success rates and metrics

### Data Storage

Results are stored in `data/results/` as JSON files with:

- Run metadata and configuration
- Individual attempt details
- Success/failure analysis
- Token usage tracking

## Performance

- **Concurrent execution** across models
- **Real-time progress** updates
- **Background processing** for long-running tests
- **Memory-efficient** result streaming

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run the test suite
5. Submit a pull request

### Development Guidelines

- Follow existing code conventions
- Add tests for new features
- Update documentation
- Ensure TypeScript compilation
- Pass ESLint checks

## Troubleshooting

### Common Issues

**Build Errors**
- Ensure all dependencies are installed
- Check TypeScript compilation: `npx tsc --noEmit`

**API Key Issues**
- Verify keys in `.env.local`
- Check API key permissions and quotas

**Test Failures**
- Review model availability
- Check network connectivity
- Verify prompt formatting

### Getting Help

1. Check the [specifications](./specs/) for detailed behavior
2. Review test results for error patterns
3. Check API provider status pages
4. Open an issue with reproduction steps

## License

MIT License - see LICENSE file for details.
