import React from 'react';
import { Text, Section, Button } from '@react-email/components';
import BaseLayout from '../components/BaseLayout';

interface JobAssignedProps {
  contractorName: string;
  date: string;
  timeWindow: string;
  location: string;
  jobDetails: string;
  dashboardLink: string;
}

export default function JobAssigned({
  contractorName = 'Contractor',
  date = 'a scheduled date',
  timeWindow = 'a specific time',
  location = 'a specified location',
  jobDetails = 'Standard Clean',
  dashboardLink = 'https://seaofblue.app/contractor'
}: JobAssignedProps) {
  return (
    <BaseLayout 
      previewText={`You've been assigned to a job on ${date}`}
      heading="New Job Assigned"
    >
      <Text className="text-gray-700 text-base leading-6">
        Hi {contractorName},
      </Text>
      <Text className="text-gray-700 text-base leading-6">
        You've been assigned to a new job! Here are the details:
      </Text>
      
      <Section className="bg-slate-100 p-4 rounded-md my-4">
        <Text className="text-gray-800 text-sm m-0 mb-2"><strong>Date:</strong> {date}</Text>
        <Text className="text-gray-800 text-sm m-0 mb-2"><strong>Time:</strong> {timeWindow}</Text>
        <Text className="text-gray-800 text-sm m-0 mb-2"><strong>Location:</strong> {location}</Text>
        <Text className="text-gray-800 text-sm m-0"><strong>Details:</strong> {jobDetails}</Text>
      </Section>

      <Text className="text-gray-700 text-base leading-6 mb-6">
        You can view full details and manage this job from your contractor dashboard. Let us know if you have any questions before then.
      </Text>

      <Section className="text-center mb-6">
        <Button
          className="bg-[#010A14] rounded-md text-white font-semibold text-sm px-6 py-3"
          href={dashboardLink}
        >
          View Dashboard
        </Button>
      </Section>

      <Text className="text-gray-700 text-base leading-6 mt-8">
        Thanks,<br />
        The Sea of Blue Team
      </Text>
    </BaseLayout>
  );
}
