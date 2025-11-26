import { createAnthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: LanguageModel;
  supportsStrictMode: boolean;
}

// Create Anthropic client with structured outputs beta header
const anthropic = createAnthropic({
  headers: {
    'anthropic-beta': 'structured-outputs-2025-11-13',
  },
});

// OpenAI models
const openaiModels: ModelConfig[] = [
  {
    id: 'openai-gpt5',
    name: 'GPT-5',
    provider: 'openai',
    model: openai('gpt-5'),
    supportsStrictMode: true,
  },
  {
    id: 'openai-gpt4o',
    name: 'GPT-4o',
    provider: 'openai',
    model: openai('gpt-4o'),
    supportsStrictMode: true,
  },
];

// Anthropic models
const anthropicModels: ModelConfig[] = [
  {
    id: 'anthropic-sonnet',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    model: anthropic('claude-sonnet-4-5-20250929'),
    supportsStrictMode: true,
  },
  {
    id: 'anthropic-opus',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    model: anthropic('claude-opus-4-5-20251101'),
    supportsStrictMode: true,
  },
];

// Google models
const googleModels: ModelConfig[] = [
  {
    id: 'google-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    model: google('gemini-2.5-flash'),
    supportsStrictMode: true,
  },
  {
    id: 'google-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    model: google('gemini-3-pro-preview'),
    supportsStrictMode: true,
  },
];

// All models
export const models: ModelConfig[] = [
  ...openaiModels,
  ...anthropicModels,
  ...googleModels,
];

export type ModelId = typeof models[number]['id'];

export function getModel(id: string): ModelConfig | undefined {
  return models.find(m => m.id === id);
}

export function getModelsByProvider(provider: 'openai' | 'anthropic' | 'google'): ModelConfig[] {
  return models.filter(m => m.provider === provider);
}

export function getEnabledModels(): ModelConfig[] {
  // For now, all models are enabled
  // Later we can add a config to disable specific models
  return models;
}

// Provider metadata for UI
export const providers = {
  openai: {
    name: 'OpenAI',
    color: '#10a37f',
  },
  anthropic: {
    name: 'Anthropic',
    color: '#d97706',
  },
  google: {
    name: 'Google',
    color: '#4285f4',
  },
} as const;
