'use client';

import { useState } from 'react';
import { Container, Stack, Title, Text, Group } from '@mantine/core'; // Added Group here
import Dashboard from '../components/Dashboard';
import Uploader from '../components/FileUploader';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Stack gap={0}>
          <Group gap="xs">
            <Title order={1} c="cyan">Turbo</Title>
            <Title order={1} c="blue">Compress</Title>
          </Group>
          <Text c="dimmed" size="sm">Local Video Compression Engine</Text>
        </Stack>
        
        {/* Pass the function here */}
        <Uploader onUploadSuccess={handleUploadSuccess} /> 
        
        {/* Pass the number here */}
        <Dashboard refreshTrigger={refreshTrigger} />
      </Stack>
    </Container>
  );
}