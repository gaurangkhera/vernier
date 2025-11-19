'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignIn() {
  const router = useRouter();
  
  useEffect(() => {
    // Auth disabled - redirect to home
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  );
}
