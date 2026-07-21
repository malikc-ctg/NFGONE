import React from 'react';
import { Text } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface JobCancelledProps {
  employeeName: string;
  date: string;
}

export default function JobCancelled({
  employeeName = 'Employee',
  date = 'TBD',
}: JobCancelledProps) {
  return (
    <BaseLayout 
      previewText={`A job assigned to you on ${date} has been cancelled`}
      heading="Job Cancelled"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {employeeName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        This is an automated notification that the job you were assigned to on {date} has been cancelled by the customer or admin.
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        This job has been removed from your active schedule. We apologize for the inconvenience and will work to offer you a replacement job if possible.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        Thanks,<br />
        The Sea of Blue Operations Team
      </Text>
    </BaseLayout>
  );
}
