import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Ethiopic, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const ethiopic = Noto_Sans_Ethiopic({ subsets: ['ethiopic'], weight: ['400', '600'], variable: '--font-ethiopic', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Lisan — AI English Tutor & IELTS Prep for Ethiopia', template: '%s · Lisan' },
  description:
    'Learn English with an AI virtual teacher built for Ethiopian learners. Speaking practice with voice recognition, AI-graded IELTS writing, listening, grammar and level-based courses.',
  keywords: ['English', 'IELTS', 'Ethiopia', 'Amharic', 'AI tutor', 'speaking practice', 'Addis Ababa'],
};

export const viewport: Viewport = { themeColor: '#059669', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${ethiopic.variable}`}>
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
