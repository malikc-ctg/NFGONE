import React from 'react';
import { Text } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface ContractorEnRouteProps {
  customerName: string;
  arrivalTime: string;
}

export default function ContractorEnRoute({
  customerName = 'Customer',
  arrivalTime = 'shortly',
}: ContractorEnRouteProps) {
  return (
    <BaseLayout 
      previewText={`Your cleaner is on the way and should arrive around ${arrivalTime}`}
      heading="Your Cleaner is On the Way"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {customerName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        Just a quick note that your cleaner is heading to your place now and should arrive around {arrivalTime}.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        See you soon,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
