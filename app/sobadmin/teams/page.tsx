'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sobadmin/employees');
  }, [router]);

  return null;
}
