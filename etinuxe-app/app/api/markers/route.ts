import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (resets on deployment/restart)
// For production, use a database like Vercel Postgres, Supabase, or MongoDB
let markersStore: any[] = [];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bounds = searchParams.get('bounds');

    let markers = [...markersStore];

    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);
      markers = markers.filter(
        (marker: any) =>
          marker.latitude >= minLat &&
          marker.latitude <= maxLat &&
          marker.longitude >= minLng &&
          marker.longitude <= maxLng
      );
    }

    // Sort by created_at desc and limit to 100
    markers = markers
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);

    return NextResponse.json({ markers });
  } catch (error) {
    console.error('Get markers error:', error);
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
      scanId,
      markerType,
      latitude,
      longitude,
      altitude = 0,
      title,
      description,
      color = '#3b82f6',
    } = data;

    const newMarker = {
      id: Date.now(),
      scan_id: scanId || null,
      user_id: 'guest',
      marker_type: markerType,
      latitude,
      longitude,
      altitude,
      title,
      description,
      color,
      created_at: new Date().toISOString(),
    };

    markersStore.push(newMarker);

    return NextResponse.json({
      success: true,
      markerId: newMarker.id,
    });
  } catch (error) {
    console.error('Create marker error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
