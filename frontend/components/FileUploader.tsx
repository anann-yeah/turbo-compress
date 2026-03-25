'use client';
import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Button, Text, Progress, Card, Group, Stack, Loader } from '@mantine/core';
import { IconUpload, IconCheck } from '@tabler/icons-react';
import axios from 'axios';

export default function FileUploader({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'done'>('idle');
  
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFFmpeg = async () => {
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }
    const ffmpeg = ffmpegRef.current;
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
    
    ffmpeg.on('log', ({ message }) => console.log(message));
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  };

  const handleProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setStatus('compressing');
      setProgress(0);

      if (!ffmpegRef.current || !ffmpegRef.current.loaded) {
        await loadFFmpeg();
      }
      
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) return;

      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      
      await ffmpeg.exec([
        '-i', 'input.mp4', 
        '-vcodec', 'libx264', 
        '-crf', '28', 
        '-preset', 'ultrafast', 
        'output.mp4'
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const compressedBlob = new Blob([data as any], { type: 'video/mp4' });
      
      setStatus('uploading');
      setProgress(0); 

      // --- FIX: USE toFixed(2) INSTEAD OF Math.round ---
      const origMB = (file.size / (1024 * 1024)).toFixed(2); 
      const compMB = (compressedBlob.size / (1024 * 1024)).toFixed(2);

      const formData = new FormData();
      formData.append('file', compressedBlob, file.name);
      formData.append('userId', 'guest-user-1');
      formData.append('originalSize', origMB); // Sends e.g. "180.50"
      formData.append('compressedSize', compMB); // Sends e.g. "45.20"

      await axios.post('http://localhost:4000/api/upload', formData, {
        onUploadProgress: (p: any) => {
          if (p.total) setProgress(Math.round((p.loaded * 100) / p.total));
        }
      });

      setStatus('done');
      onUploadSuccess(); 

      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 3000);

    } catch (error) {
      console.error("Pipeline failed:", error);
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={700} size="lg" c="cyan">TurboCompress Engine</Text>
          {status !== 'idle' && <Loader size="sm" color="cyan" />}
        </Group>

        <Text size="sm" c="dimmed" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
          Status: {status}
        </Text>
        
        <Button 
          component="label" 
          leftSection={status === 'done' ? <IconCheck size={18} /> : <IconUpload size={18} />} 
          color={status === 'done' ? 'green' : 'pink'} 
          fullWidth
          loading={loading}
        >
          {status === 'idle' && 'Select Video to Compress'}
          {status === 'compressing' && 'Compressing (Local WASM)...'}
          {status === 'uploading' && 'Uploading Compressed File...'}
          {status === 'done' && 'Upload Complete!'}
          
          <input 
            type="file" 
            style={{ display: 'none' }} 
            onChange={handleProcess} 
            accept="video/*" 
            disabled={loading} 
          />
        </Button>

        {progress > 0 && status !== 'done' && (
          <Stack gap={5}>
            <Group justify="space-between">
              <Text size="xs" c="cyan" fw={700}>
                {status === 'compressing' ? 'Compression Progress' : 'Upload Progress'}
              </Text>
              <Text size="xs" fw={700} c="cyan">{progress}%</Text>
            </Group>
            <Progress value={progress} color="cyan" striped animated size="lg" radius="xl" />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}