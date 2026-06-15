'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthInterceptor() {
  const router = useRouter();

  useEffect(() => {
    // This runs on every page load.
    // If Supabase stripped the path and fell back to the root domain,
    // we intercept the hash and manually route them to the correct page.
    
    const hash = window.location.hash;
    const search = window.location.search;

    if (hash && hash.includes('type=invite')) {
      // It's a contractor invite! Route them to onboarding, preserving the hash so Supabase can consume it.
      if (!window.location.pathname.includes('/contractor/onboarding')) {
        window.location.href = `/contractor/onboarding${hash}`;
      }
    } else if (search && search.includes('type=invite') && search.includes('token_hash=')) {
      // PKCE flow invite! Route them to onboarding, preserving the search params.
      if (!window.location.pathname.includes('/contractor/onboarding')) {
        window.location.href = `/contractor/onboarding${search}`;
      }
    }
  }, [router]);

  return null;
}
