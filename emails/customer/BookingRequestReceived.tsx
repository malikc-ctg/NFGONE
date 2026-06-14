import React from 'react';
import { Text } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface BookingRequestReceivedProps {
  customerName: string;
  serviceType: string;
  date: string;
  timeWindow: string;
}

export default function BookingRequestReceived({
  customerName = 'Valued Customer',
  serviceType = 'Cleaning Service',
  date = 'a later date',
  timeWindow = 'the morning',
}: BookingRequestReceivedProps) {
  return (
    <BaseLayout 
      previewText="We have received your booking request"
      heading="Request Received"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {customerName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        Thanks for reaching out to Sea of Blue. We've received your request for {serviceType} on {date} during {timeWindow}.
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        We're confirming availability in our network now and will follow up shortly to lock in the details and finalize your booking.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        Talk soon,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
