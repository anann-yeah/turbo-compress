'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Paper, Title, TextInput, PasswordInput, Button, Text, Anchor, Stack, Alert } from '@mantine/core';
import axios from 'axios';
import { setToken } from '../../lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/signup', { name, email, password });
      setToken(res.data.token);
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Title ta="center" c="cyan">Create an account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account? <Anchor component="a" href="/login">Sign in</Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && <Alert color="red">{error}</Alert>}
            <TextInput
              label="Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              placeholder="At least 8 characters"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <Button type="submit" fullWidth color="cyan" loading={loading}>
              Sign up
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
