'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DisputesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sobadmin/jobs');
  }, [router]);

  return null;
}
