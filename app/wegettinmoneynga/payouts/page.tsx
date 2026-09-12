'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PayoutsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/wegettinmoneynga/employees');
  }, [router]);

  return null;
}
