'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Map, Scan, LogOut, User } from 'lucide-react';
import ARScanner from '@/components/ARScanner';
import Map3D from '@/components/Map3D';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'map' | 'scan'>('map');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg border border-primary/30">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Vernier</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-border">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">{session.user?.name}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {activeTab === 'map' ? <Map3D /> : <ARScanner />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-card/90 backdrop-blur-md border-t border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-4 px-6 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'map'
                ? 'bg-primary/20 text-primary border-t-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Map className="w-6 h-6" />
            <span className="text-xs font-medium">Map</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-4 px-6 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'scan'
                ? 'bg-primary/20 text-primary border-t-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Scan className="w-6 h-6" />
            <span className="text-xs font-medium">Scan</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
