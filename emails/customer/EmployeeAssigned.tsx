import React from 'react';
import { Text } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface EmployeeAssignedProps {
  customerName: string;
  date: string;
  timeWindow: string;
}

export default function EmployeeAssigned({
  customerName = 'Customer',
  date = 'your scheduled date',
  timeWindow = 'your time window',
}: EmployeeAssignedProps) {
  return (
    <BaseLayout 
      previewText={`We've assigned a cleaner for your service on ${date}`}
      heading="Your Cleaner is Set"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {customerName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        Good news! We've assigned a professional cleaner for your service on {date} during {timeWindow}. 
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        They'll be in touch if anything is needed before they arrive.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        Thanks,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
