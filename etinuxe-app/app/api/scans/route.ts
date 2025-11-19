import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (resets on deployment/restart)
// For production, use a database like Vercel Postgres, Supabase, or MongoDB
let scansStore: any[] = [];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bounds = searchParams.get('bounds');

    let scans = [...scansStore];

    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);
      scans = scans.filter(
        (scan: any) =>
          scan.latitude >= minLat &&
          scan.latitude <= maxLat &&
          scan.longitude >= minLng &&
          scan.longitude <= maxLng
      );
    }

    // Sort by created_at desc and limit to 100
    scans = scans
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);

    return NextResponse.json({ scans });
  } catch (error) {
    console.error('Get scans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      type,
      threatLevel,
      objectName,
      latitude,
      longitude,
      altitude = 0,
      description,
      metadata,
    } = data;

    const newScan = {
      id: Date.now(),
      user_id: 'guest',
      type,
      threat_level: threatLevel,
      object_name: objectName,
      latitude,
      longitude,
      altitude,
      description,
      metadata,
      created_at: new Date().toISOString(),
    };

    scansStore.push(newScan);

    return NextResponse.json({
      success: true,
      scanId: newScan.id,
    });
  } catch (error) {
    console.error('Create scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
