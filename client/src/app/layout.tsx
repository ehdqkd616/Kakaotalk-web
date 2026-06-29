import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KakaoTalk Web',
  description: '브라우저에서 사용하는 카카오톡 웹 클라이언트',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="h-full bg-gray-100 antialiased">{children}</body>
    </html>
  );
}
