import React from 'react';
import { Text } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface ServiceCompletedProps {
  customerName: string;
  completionTime: string;
}

export default function ServiceCompleted({
  customerName = 'Customer',
  completionTime = 'now',
}: ServiceCompletedProps) {
  return (
    <BaseLayout 
      previewText={`Your cleaning is complete as of ${completionTime}`}
      heading="All Done!"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {customerName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        Your cleaning is complete as of {completionTime}. We hope everything looks great.
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        If anything was missed or you have feedback, just reply to this email and we'll make it right.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        Thanks for choosing Sea of Blue,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
