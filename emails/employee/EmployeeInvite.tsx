import React from 'react';
import { Text, Button, Section } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface EmployeeInviteProps {
  fullName: string;
  inviteLink: string;
}

export default function EmployeeInvite({
  fullName = 'Employee',
  inviteLink = 'https://seaofblue.app/employee/onboarding',
}: EmployeeInviteProps) {
  return (
    <BaseLayout 
      previewText="You've been invited to join Sea of Blue"
      heading="Welcome to Sea of Blue"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {fullName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        You have been invited by an administrator to join Sea of Blue as an authorized employee. 
        We are excited to have you on the platform.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mb-6">
        Click the button below to complete your profile, submit your documents, and start receiving jobs.
      </Text>
      
      <Section className="text-center mb-6">
        <Button
          className="bg-[#010A14] rounded-md text-white font-semibold text-sm px-6 py-3"
          href={inviteLink}
        >
          Complete Your Profile
        </Button>
      </Section>

      <Text className="text-gray-700 text-base leading-6">
        If you have any questions, feel free to reply directly to this email.
      </Text>
      <Text className="text-gray-700 text-base leading-6 mt-8">
        Welcome aboard,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
