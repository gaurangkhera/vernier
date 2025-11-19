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

    let scans;
    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);
      scans = db
        .prepare(
          `SELECT * FROM scans 
           WHERE latitude BETWEEN ? AND ? 
           AND longitude BETWEEN ? AND ?
           ORDER BY created_at DESC`
        )
        .all(minLat, maxLat, minLng, maxLng);
    } else {
      scans = db
        .prepare('SELECT * FROM scans ORDER BY created_at DESC LIMIT 100')
        .all();
    }

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const userId = (session.user as any).id;

    const result = db
      .prepare(
        `INSERT INTO scans 
         (user_id, type, threat_level, object_name, latitude, longitude, altitude, description, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        type,
        threatLevel,
        objectName,
        latitude,
        longitude,
        altitude,
        description,
        JSON.stringify(metadata)
      );

    return NextResponse.json({
      success: true,
      scanId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Create scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
