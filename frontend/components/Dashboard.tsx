'use client';
import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Badge, Card, Title, Group, Text, Loader, Center, Stack } from '@mantine/core';
import { IconTrash, IconBolt, IconDownload } from '@tabler/icons-react';

interface VideoFile {
  id: string;
  filename: string;
  originalSize: number; 
  compressedSize: number; 
  status: string;
}

export default function Dashboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:4000/api/files');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, [fetchFiles, refreshTrigger]);

  // --- NEW: Download Handler ---
  const handleDownload = async (fileId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/download/${fileId}`);
      if (!res.ok) throw new Error('Download failed');
      
      const { url } = await res.json();
      // Directly opens the presigned S3 link in a new tab
      window.open(url, '_blank');
    } catch (err) {
      console.error("Download error:", err);
      alert("Could not generate download link. Is the backend running?");
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/files/${fileId}`, { 
        method: 'DELETE' 
      });
      if (res.ok) fetchFiles();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleUpgrade = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/checkout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'guest-user-1' })
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Upgrade failed", err);
    }
  };

  if (loading) return <Center py="xl"><Loader color="cyan" /></Center>;

  return (
    <div style={{ padding: '1rem 0' }}>
      <Group justify="space-between" mb="xl">
        <Title order={2} c="cyan">My Files</Title>
        <Button 
          color="pink" 
          variant="filled" 
          leftSection={<IconBolt size={18} />}
          onClick={handleUpgrade}
        >
          Upgrade to Lifetime Pro (₹2999)
        </Button>
      </Group>

      <Card withBorder radius="md" padding="0">
        <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead bg="dark.7">
            <Table.Tr>
              <Table.Th>Filename</Table.Th>
              <Table.Th>Size Optimization</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {files.length > 0 ? (
              files.map((file) => {
                const savedPercent = file.originalSize > 0 
                  ? Math.round(((file.originalSize - file.compressedSize) / file.originalSize) * 100) 
                  : 0;

                return (
                  <Table.Tr key={file.id}>
                    <Table.Td fw={500}>{file.filename}</Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="sm" fw={700}>
                          {file.originalSize}MB <Text span c="dimmed" fw={400}>➔</Text> <Text span c="green.4">{file.compressedSize}MB</Text>
                        </Text>
                        {savedPercent > 0 && (
                          <Text size="xs" c="green.5" fw={600}>{savedPercent}% smaller</Text>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={file.status === 'SAFE' ? 'green' : 'orange'} variant="dot">
                        {file.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap="xs" justify="flex-end">
                        <Button 
                          size="xs" 
                          variant="light" 
                          color="cyan" 
                          leftSection={<IconDownload size={14} />}
                          onClick={() => handleDownload(file.id)}
                        >
                          Download
                        </Button>
                        <Button 
                          size="xs" 
                          variant="subtle" 
                          color="red" 
                          leftSection={<IconTrash size={14} />}
                          onClick={() => handleDelete(file.id)}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            ) : (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" py="xl" ta="center">No files yet. Start compressing!</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </div>
  );
}