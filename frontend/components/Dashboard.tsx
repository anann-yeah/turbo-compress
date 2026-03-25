'use client';
import { Table, Button, Badge, Card, Title, Group } from '@mantine/core';

export default function Dashboard() {
  const handleUpgrade = async () => {
    const res = await fetch('http://localhost:4000/api/checkout', { method: 'POST' });
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Group justify="space-between" mb="xl">
        <Title order={2} c="cyan">My Files</Title>
        <Button color="pink" variant="gradient" gradient={{ from: 'pink', to: 'cyan' }} onClick={handleUpgrade}>
          Upgrade to Lifetime Pro (₹2999)
        </Button>
      </Group>

      <Card withBorder radius="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Filename</Table.Th>
              <Table.Th>Saved Data</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>demo_video.mp4</Table.Td>
              <Table.Td>500MB ➔ <span style={{ color: '#22c55e' }}>50MB</span></Table.Td>
              <Table.Td><Badge color="cyan" variant="light">SAFE</Badge></Table.Td>
              <Table.Td>
                <Button size="xs" variant="subtle" color="red">Delete</Button>
                <Button size="xs" variant="subtle" color="cyan">Swap</Button>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>
    </div>
  );
}