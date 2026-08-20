import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Court Inquest & Moderation Registry',
  description: 'Judicial moderation ledger and community inquest review.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
