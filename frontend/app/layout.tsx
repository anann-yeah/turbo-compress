import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';

export const metadata = {
  title: 'TurboCompress | Fast Local Compression',
};

const cyberpunkTheme = createTheme({
  primaryColor: 'cyan',
  colors: {
    cyan: ['#e0fbff', '#cbf3ff', '#9ae5ff', '#64d7ff', '#3dcbff', '#24c3ff', '#13beff', '#00a6e4', '#0094cd', '#0080b6'],
    pink: ['#ffe2f3', '#ffccee', '#ff9be0', '#ff64d3', '#ff38c7', '#ff1bc0', '#ff09be', '#e400a8', '#cb0096', '#b10084'],
  },
  defaultRadius: 'md',
});
const theme = createTheme({});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}