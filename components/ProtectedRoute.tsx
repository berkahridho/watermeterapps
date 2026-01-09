'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Set client-side flag
    setIsClient(true);
    
    // Check authentication
    const userData = localStorage.getItem('user');
    setIsAuthenticated(!!userData);
    
    if (requireAuth && !userData) {
      router.push('/');
    } else if (!requireAuth && userData) {
      router.push('/dashboard');
    }
  }, [requireAuth, router]);

  // Don't render anything on server-side
  if (!isClient) {
    return null;
  }

  // Check authentication after client-side hydration
  if (requireAuth && !isAuthenticated) {
    return null; // Return nothing while redirecting
  } else if (!requireAuth && isAuthenticated) {
    return null; // Return nothing while redirecting
  }

  return <>{children}</>;
}