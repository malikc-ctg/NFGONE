import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import React from 'react';

interface BaseLayoutProps {
  previewText: string;
  heading: string;
  children: React.ReactNode;
}

export default function BaseLayout({ previewText, heading, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-[#f6f9fc] my-auto mx-auto font-sans">
          <Container className="bg-white border border-gray-200 rounded-xl my-10 mx-auto p-10 shadow-sm max-w-[600px]">
            <Section className="mt-2 mb-8">
              <Heading className="text-2xl font-bold text-center text-[#010A14] m-0 font-sans tracking-tight">
                SEA OF BLUE
              </Heading>
            </Section>
            
            <Section className="mb-6">
              <Heading className="text-xl font-semibold text-gray-900 m-0 mb-4">
                {heading}
              </Heading>
              {children}
            </Section>

            <Hr className="border border-gray-200 my-8" />
            
            <Section>
              <Text className="text-[#666666] text-xs leading-6 m-0 text-center">
                Sea of Blue Home Services
                <br />
                info@seaofblue.app
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
