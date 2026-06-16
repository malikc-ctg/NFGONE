import React from 'react';
import { Text } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface JobCancelledProps {
  customerName: string;
  date: string;
}

export default function JobCancelled({
  customerName = 'Customer',
  date = 'TBD',
}: JobCancelledProps) {
  return (
    <BaseLayout 
      previewText={`Your cleaning on ${date} has been cancelled`}
      heading="Booking Cancelled"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {customerName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        This is a confirmation that your cleaning scheduled for {date} has been successfully cancelled.
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        If you have any questions or need to reschedule, please reply directly to this email or visit your customer dashboard.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        Thanks,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
