import { NextResponse } from 'next/server';
import { models, providers } from '@/lib/models';

export async function GET() {
  const envKeys: Record<string, boolean> = {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    google: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  };

  const modelList = models.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    providerName: providers[m.provider].name,
    providerColor: providers[m.provider].color,
    supportsStrictMode: m.supportsStrictMode,
    hasEnvKey: envKeys[m.provider] || false,
  }));

  return NextResponse.json({
    models: modelList,
    providers: Object.entries(providers).map(([id, data]) => ({
      id,
      ...data,
    })),
    envKeys,
  });
}
