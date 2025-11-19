import { NextRequest, NextResponse } from 'next/server';

// Registration disabled - auth is temporarily disabled
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Registration disabled' },
    { status: 404 }
  );
}
