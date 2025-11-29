import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { provider, key } = await request.json();

  if (!provider || !key) {
    return NextResponse.json({ valid: false, error: 'Missing provider or key' }, { status: 400 });
  }

  try {
    switch (provider) {
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (res.ok) return NextResponse.json({ valid: true });
        const data = await res.json();
        return NextResponse.json({ valid: false, error: data.error?.message || 'Invalid key' });
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (res.ok) return NextResponse.json({ valid: true });
        const data = await res.json();
        if (data.error?.type === 'authentication_error') {
          return NextResponse.json({ valid: false, error: 'Invalid API key' });
        }
        return NextResponse.json({ valid: true });
      }

      case 'google': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        if (res.ok) return NextResponse.json({ valid: true });
        const data = await res.json();
        return NextResponse.json({ valid: false, error: data.error?.message || 'Invalid key' });
      }

      case 'groq': {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (res.ok) return NextResponse.json({ valid: true });
        const data = await res.json();
        return NextResponse.json({ valid: false, error: data.error?.message || 'Invalid key' });
      }

      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (res.ok) return NextResponse.json({ valid: true });
        return NextResponse.json({ valid: false, error: 'Invalid key' });
      }

      default:
        return NextResponse.json({ valid: false, error: 'Unknown provider' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
}
