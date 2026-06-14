import React from 'react';
import { Text, Section, Button } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface ReviewRequestProps {
  customerName: string;
  date: string;
  reviewLink: string;
}

export default function ReviewRequest({
  customerName = 'Customer',
  date = 'recently',
  reviewLink = 'https://seaofblue.app/reviews',
}: ReviewRequestProps) {
  return (
    <BaseLayout 
      previewText={`How did we do on your cleaning?`}
      heading="How did we do?"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {customerName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        Thanks again for choosing Sea of Blue for your cleaning on {date}. 
      </Text>
      <Text className="text-gray-700 text-base leading-6 mb-6">
        If you have a minute, we'd really appreciate a quick review. It helps a lot and means a lot to our small team.
      </Text>
      
      <Section className="text-center mb-6">
        <Button
          className="bg-[#2563eb] rounded-md text-white font-semibold text-sm px-6 py-3"
          href={reviewLink}
        >
          Leave a Review
        </Button>
      </Section>

      <Text className="text-gray-700 text-base leading-6 mt-8">
        Thanks so much,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
