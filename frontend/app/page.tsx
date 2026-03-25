'use client';
import Dashboard from '../components/Dashboard';
import Uploader from '../components/FileUploader'; // Make sure this file exists in components!
import { Container, Stack, Title } from '@mantine/core';

export default function Home() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Title order={1} c="cyan">TurboCompress</Title>
        
        {/* THE MISSING PIECE */}
        <Uploader /> 
        
        <Dashboard />
      </Stack>
    </Container>
  );
}