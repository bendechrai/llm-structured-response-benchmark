import { NextRequest, NextResponse } from 'next/server';
import { loadTestRun, deleteTestRun } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = loadTestRun(id);

  if (!run) {
    return NextResponse.json(
      { error: 'Result not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(run);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteTestRun(id);

  if (!deleted) {
    return NextResponse.json(
      { error: 'Result not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
