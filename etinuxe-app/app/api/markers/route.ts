import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const MARKERS_FILE = path.join(DATA_DIR, 'markers.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(MARKERS_FILE)) {
  fs.writeFileSync(MARKERS_FILE, JSON.stringify([]));
}

function readMarkers() {
  try {
    const data = fs.readFileSync(MARKERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeMarkers(markers: any[]) {
  fs.writeFileSync(MARKERS_FILE, JSON.stringify(markers, null, 2));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bounds = searchParams.get('bounds');

    let markers = readMarkers();

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

    const markers = readMarkers();
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

    markers.push(newMarker);
    writeMarkers(markers);

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
