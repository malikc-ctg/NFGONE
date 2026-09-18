'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PartnersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sobadmin');
  }, [router]);

  return null;
}
