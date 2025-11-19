import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bounds = searchParams.get('bounds');

    let markers;
    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);
      markers = db
        .prepare(
          `SELECT * FROM markers 
           WHERE latitude BETWEEN ? AND ? 
           AND longitude BETWEEN ? AND ?
           ORDER BY created_at DESC`
        )
        .all(minLat, maxLat, minLng, maxLng);
    } else {
      markers = db
        .prepare('SELECT * FROM markers ORDER BY created_at DESC LIMIT 100')
        .all();
    }

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const userId = (session.user as any).id;

    const result = db
      .prepare(
        `INSERT INTO markers 
         (scan_id, user_id, marker_type, latitude, longitude, altitude, title, description, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        scanId || null,
        userId,
        markerType,
        latitude,
        longitude,
        altitude,
        title,
        description,
        color
      );

    return NextResponse.json({
      success: true,
      markerId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Create marker error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
