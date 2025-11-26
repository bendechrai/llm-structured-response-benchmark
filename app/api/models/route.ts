import { NextResponse } from 'next/server';
import { models, providers } from '@/lib/models';

export async function GET() {
  const modelList = models.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    providerName: providers[m.provider].name,
    providerColor: providers[m.provider].color,
    supportsStrictMode: m.supportsStrictMode,
  }));

  return NextResponse.json({
    models: modelList,
    providers: Object.entries(providers).map(([id, data]) => ({
      id,
      ...data,
    })),
  });
}
