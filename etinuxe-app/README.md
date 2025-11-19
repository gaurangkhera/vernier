# Etinuxe - Underground Navigation System

An advanced AR scanning and 3D navigation application built for the Etinuxe community - an underground society of miniature humans continuing the research of Dr. Miniature, who successfully miniaturized all of his lab rats.

## Features

### 🔍 AR Scanner
- Real-time environment scanning using device camera
- Object detection and threat analysis
- Automatic threat level classification (high, medium, low)
- Distance estimation for detected objects
- Save scans as markers on the map
- Detects potential threats like cats, mouse traps, spiders
- Identifies obstacles like books, cups, shoes
- Locates useful items like food crumbs, shelter, tools

### 🗺️ 3D Map Navigator
- Interactive 3D map with Three.js rendering
- Google Maps-style navigation interface
- Real-time threat visualization
- Color-coded markers (Red: High threat, Yellow: Medium, Blue: Low, Cyan: Your location)
- Orbit controls for 360° viewing
- Dynamic terrain with obstacles
- Hover tooltips for detailed information

### 🔐 Authentication
- Secure user registration and login
- Password hashing with bcrypt
- Session management with NextAuth.js
- Protected routes

### 💾 Local Database
- SQLite for lightweight data storage
- Stores user accounts, scan history, and map markers
- Location-based queries

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript
- **UI**: Tailwind CSS, Lucide Icons
- **3D Graphics**: Three.js, React Three Fiber, Drei
- **Authentication**: NextAuth.js
- **Database**: Better-SQLite3
- **State Management**: Zustand

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### First Time Setup

1. Click "Register" to create an account
2. Enter a username and password (min 6 characters)
3. Grant camera and location permissions when prompted
4. Start scanning and mapping!

## Usage

### AR Scanner Tab
- Click camera button to activate AR scanner
- Point device at objects for detection
- Click "Save" on detections to add to map

### Map Tab
- View all saved scans in interactive 3D
- Rotate view by dragging, zoom with scroll
- Click markers for details
- Use "Recenter" to refresh data

## API Routes

- `POST /api/auth/register` - Create account
- `GET/POST /api/scans` - Manage scans
- `GET/POST /api/markers` - Manage markers

## Story Context

The Etinuxe are a community of miniature humans living underground, carrying on Dr. Miniature's research. After successfully miniaturizing lab rats, his work led to an entire civilization of tiny humans who must navigate a world of giant-scale threats. This app helps them survive and thrive.

## License

MIT License
