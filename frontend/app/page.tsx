'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Stack, Title, Text, Group, Button, Center, Loader } from '@mantine/core';
import Dashboard from '../components/Dashboard';
import Uploader from '../components/FileUploader';
import { getToken, clearToken } from '../lib/auth';

export default function Home() {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  if (checkingAuth) {
    return (
      <Center h="100vh">
        <Loader color="cyan" />
      </Center>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={0}>
            <Group gap="xs">
              <Title order={1} c="cyan">Turbo</Title>
              <Title order={1} c="blue">Compress</Title>
            </Group>
            <Text c="dimmed" size="sm">Local Video Compression Engine</Text>
          </Stack>
          <Button variant="subtle" color="gray" onClick={handleLogout}>
            Log out
          </Button>
        </Group>

        <Uploader onUploadSuccess={handleUploadSuccess} />
        <Dashboard refreshTrigger={refreshTrigger} />
      </Stack>
    </Container>
  );
}
