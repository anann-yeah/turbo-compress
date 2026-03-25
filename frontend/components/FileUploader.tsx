'use client';
import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Button, Text, Progress, Card, Group } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';

export default function FileUploader() {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef(new FFmpeg());

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setLoaded(true);
  };

  const handleTranscode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!loaded) await load();
    const ffmpeg = ffmpegRef.current;
    
    // 1. Write file to WASM FS
    await ffmpeg.writeFile(file.name, await fetchFile(file));
    
    // 2. Compress (adjust crf for quality/size tradeoff)
    await ffmpeg.exec(['-i', file.name, '-vcodec', 'libx264', '-crf', '28', 'output.mp4']);
    
    // 3. Read compressed file
    const data = await ffmpeg.readFile('output.mp4');
    const compressedBlob = new Blob([data as any], { type: 'video/mp4' });
    console.log(`Original: ${file.size} bytes | Compressed: ${compressedBlob.size} bytes`);
    
    // 4. API Call -> Get Presigned URL -> Upload to S3
    // await uploadToS3(compressedBlob); 
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={500} c="cyan">Client-Side WASM Compressor</Text>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Compress locally. Bypass slow Indian upload limits.
      </Text>
      
      <Button component="label" leftSection={<IconUpload size={14} />} color="pink" fullWidth>
        Select Video
        <input type="file" style={{ display: 'none' }} onChange={handleTranscode} accept="video/*" />
      </Button>

      {progress > 0 && (
  <Progress.Root size="xl" mt="md">
    <Progress.Section value={progress} color="cyan" striped animated>
      <Progress.Label>{progress}%</Progress.Label>
    </Progress.Section>
  </Progress.Root>
)}
    </Card>
  );
}