import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SCANS_FILE = path.join(DATA_DIR, 'scans.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SCANS_FILE)) {
  fs.writeFileSync(SCANS_FILE, JSON.stringify([]));
}

function readScans() {
  try {
    const data = fs.readFileSync(SCANS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeScans(scans: any[]) {
  fs.writeFileSync(SCANS_FILE, JSON.stringify(scans, null, 2));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bounds = searchParams.get('bounds');

    let scans = readScans();

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

    const scans = readScans();
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

    scans.push(newScan);
    writeScans(scans);

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
