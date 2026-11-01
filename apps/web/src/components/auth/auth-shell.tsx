import { CheckCircle2 } from 'lucide-react';
import { Logo } from '../logo';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-emerald-600 lg:block">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-gold-300/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo light />
          <div>
            <p className="font-ethiopic text-2xl font-semibold text-brand-100">“ቋንቋ የእውቀት መክፈቻ ነው።”</p>
            <p className="mt-1 text-brand-200">Language is the key to knowledge.</p>
            <ul className="mt-10 space-y-4 text-lg">
              {['Speak with an AI tutor that hears your voice', 'Get IELTS band scores on every essay', 'Courses from Band 4 to Band 8', 'Explanations in Amharic when you need them'].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-gold-300" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-brand-200">Join learners across Addis Ababa, Hawassa, Bahir Dar, Mekelle, Adama and beyond.</p>
        </div>
      </div>
    </div>
  );
}
