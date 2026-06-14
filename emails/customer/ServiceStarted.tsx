import React from 'react';
import { Text } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface ServiceStartedProps {
  customerName: string;
  startTime: string;
}

export default function ServiceStarted({
  customerName = 'Customer',
  startTime = 'now',
}: ServiceStartedProps) {
  return (
    <BaseLayout 
      previewText={`Your cleaning service has started as of ${startTime}`}
      heading="Service Started"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {customerName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        Just letting you know your cleaning service has started as of {startTime}. 
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        If you have any specific instructions or areas you'd like the team to focus on, feel free to reach out directly.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        Thanks,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
