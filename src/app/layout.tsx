import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import QueryProvider from '@/components/providers/QueryProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClickUp Mind Map · Gamificação',
  description: 'Visualize sua hierarquia de Folders, Lists e Tasks do ClickUp como um mapa interativo de grafos.',
  keywords: ['clickup', 'mind map', 'produtividade', 'gamificação', 'task management'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
