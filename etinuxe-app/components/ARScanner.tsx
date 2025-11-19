'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Scan, AlertTriangle, Loader2, MapPin, Sparkles, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { GoogleGenAI } from '@google/genai';

interface DetectedObject {
  name: string;
  confidence: number;
  threatLevel: 'low' | 'medium' | 'high' | 'none';
  description: string;
  category: string;
}

export default function ARScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isScanning, setIsScanning, userLocation, addScan } = useAppStore();

  useEffect(() => {
    if (isScanning) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScanning]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please grant camera permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setDetectedObjects([]);
    setIsAnalyzing(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');

      // Resize to reduce payload
      const targetWidth = 640;
      const targetHeight = 480;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const base64Image = imageDataUrl.split(',')[1];

      // Use Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          { 
            text: `Analyze this image from the perspective of a miniature human (2-3 inches tall) navigating an underground/indoor environment.

Identify and categorize ALL visible objects:
1. THREATS: Predators (cats, spiders, insects), traps, dangerous equipment
2. OBSTACLES: Large objects blocking paths (books, furniture, containers)
3. RESOURCES: Food sources, water sources, shelter opportunities
4. TOOLS: Useful items (paperclips, string, containers)
5. NAVIGATION: Landmarks, pathways, entry/exit points

Respond with ONLY a JSON array:
[{"name":"Object Name","category":"threat/obstacle/resource/tool/landmark","threatLevel":"high/medium/low/none","confidence":0.0-1.0,"description":"Why this matters to a miniature human"}]`
          }
        ],
      });

      const responseText = result.text;
      console.log(responseText);
      
      if (!responseText) {
        throw new Error('No response from API');
      }

      let jsonText = responseText.trim();
      
      // Extract JSON from markdown if wrapped
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const objects = JSON.parse(jsonText);
      
      const formattedObjects: DetectedObject[] = objects.map((obj: any) => ({
        name: obj.name || 'Unknown',
        category: obj.category || 'unknown',
        threatLevel: obj.threatLevel || 'none',
        confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.5,
        description: obj.description || 'No description available',
      }));

      setDetectedObjects(formattedObjects);

    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveScan = async (obj: DetectedObject) => {
    if (!userLocation) {
      setError('Location not available. Please enable location services.');
      return;
    }

    try {
      const scanData = {
        type: obj.category,
        threatLevel: obj.threatLevel,
        objectName: obj.name,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        altitude: userLocation.alt,
        description: obj.description,
        metadata: { confidence: obj.confidence },
      };

      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanData),
      });

      if (!response.ok) throw new Error('Failed to save scan');

      const data = await response.json();
      addScan(data.scan);
      
      // Remove from detected list after saving
      setDetectedObjects(prev => prev.filter(o => o !== obj));
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save scan. Please try again.');
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500';
      case 'medium': return 'text-orange-400 bg-orange-500/20 border-orange-500';
      case 'low': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500';
    }
  };

  const getThreatIcon = (level: string) => {
    if (level === 'high' || level === 'medium') {
      return <AlertTriangle className="w-5 h-5" />;
    }
    return <Sparkles className="w-5 h-5" />;
  };

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      <canvas ref={canvasRef} className="hidden" />

      {isScanning && (
        <>
          {/* Scanning Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full border-2 border-primary/30">
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-primary"></div>
              <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-primary"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-primary"></div>
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent"></div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-destructive/20 border border-destructive backdrop-blur-md rounded-lg p-4 z-10">
              <div className="flex items-center gap-2 text-destructive-foreground">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* AI Analysis Results */}
          <div className="absolute top-4 left-4 right-4 bottom-32 overflow-y-auto space-y-2 z-10">
            {detectedObjects.slice(0, 3).map((obj, idx) => (
              <div
                key={idx}
                className={`backdrop-blur-md rounded-lg p-3 border-2 ${getThreatColor(obj.threatLevel)}`}
              >
                <div className="flex items-start gap-2">
                  {getThreatIcon(obj.threatLevel)}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm">{obj.name}</div>
                    <div className="text-xs opacity-90 mt-1 line-clamp-2">{obj.description}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs opacity-75">
                      <span>{obj.category}</span>
                      <span>{(obj.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => saveScan(obj)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    Save
                  </button>
                </div>
              </div>
            ))}
            {detectedObjects.length > 3 && (
              <div className="text-center text-xs text-muted-foreground bg-card/80 backdrop-blur-md rounded-lg p-2">
                +{detectedObjects.length - 3} more objects detected
              </div>
            )}
          </div>

          {/* Scan Button */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={captureAndAnalyze}
              disabled={isAnalyzing}
              className={`px-8 py-4 rounded-full font-bold text-lg shadow-2xl transition-all ${
                isAnalyzing
                  ? 'bg-muted cursor-not-allowed text-muted-foreground'
                  : 'bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground'
              } flex items-center gap-3`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Scan className="w-6 h-6" />
                  Scan Now
                </>
              )}
            </button>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-primary/20 backdrop-blur-md rounded-full px-6 py-2 border border-primary flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-primary-foreground text-sm font-medium">AI Scanner Active</span>
            </div>
          </div>
        </>
      )}

      {/* Toggle Scanner Button */}
      <button
        onClick={() => setIsScanning(!isScanning)}
        className={`absolute top-4 right-4 p-4 rounded-full shadow-2xl transition-all z-20 ${
          isScanning
            ? 'bg-destructive hover:bg-destructive/90'
            : 'bg-primary hover:bg-primary/90'
        } text-primary-foreground`}
      >
        <Camera className="w-6 h-6" />
      </button>

      {/* Instructions when camera is off */}
      {!isScanning && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <Camera className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">AI-Powered Scanner</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Tap the camera button to activate the AI scanner. Point your camera at objects and tap &quot;Scan Now&quot; to analyze threats and resources from a miniature human&apos;s perspective.
            </p>
            <button
              onClick={() => setIsScanning(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors"
            >
              <Camera className="w-5 h-5" />
              Activate Scanner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
