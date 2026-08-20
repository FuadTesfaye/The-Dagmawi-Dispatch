import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Court Scribe Entry — Authenticate',
  description:
    'Sign in via Telegram handle or bot to stamp reactions, enter court testimony, and command AI editorial intelligence.',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Court Scribe Entry | The Lurkening',
    description: 'Authenticate with Telegram for full archival access.',
    url: '/login',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
