import React from 'react';
import { Text } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface BookingConfirmedProps {
  customerName: string;
  date: string;
  timeWindow: string;
}

export default function BookingConfirmed({
  customerName = 'Valued Customer',
  date = 'your scheduled date',
  timeWindow = 'your time window',
}: BookingConfirmedProps) {
  return (
    <BaseLayout 
      previewText={`Your booking is confirmed for ${date}`}
      heading="Booking Confirmed"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {customerName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        Your service is officially confirmed for {date} during {timeWindow}. 
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        Our team will arrive at the address you provided and take it from there. If anything changes on your end, just reply to this email and we'll sort it out.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        Thanks for choosing us,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
