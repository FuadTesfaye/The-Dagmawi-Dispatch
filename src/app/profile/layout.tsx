import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Court Scribe Profile & Dossier',
  description:
    'Manage your monitored Telegram channel subscriptions, testimony records, and personal dossier.',
  alternates: {
    canonical: '/profile',
  },
  openGraph: {
    title: 'Court Scribe Profile & Dossier | The Lurkening',
    description: 'Manage your monitored channel subscriptions and records.',
    url: '/profile',
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
