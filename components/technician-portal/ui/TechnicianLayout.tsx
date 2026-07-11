import React from 'react';
import { UserIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface TechnicianLayoutProps {
  children: React.ReactNode;
  technicianName?: string;
  onLogout: () => void;
  onBack?: () => void;
  title?: string;
  step?: number;
  totalSteps?: number;
}

const TechnicianLayout: React.FC<TechnicianLayoutProps> = ({
  children,
  technicianName,
  onLogout,
  onBack,
  title,
  step,
  totalSteps,
}) => {
  return (
    <div className="min-h-screen bg-espresso text-cream font-sans selection:bg-primary/30">
      {/* Background Grid Pattern (Subtle) */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none dark-grid" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-espresso/80 backdrop-blur-sm border-b border-hairline/50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {onBack ? (
                    <button onClick={onBack} className="p-2 -ml-2 text-latte hover:text-cream transition-colors rounded-full active:bg-espresso-light" aria-label="رجوع">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                ) : (
                   <div className="w-9 h-9 bg-espresso-light/50 rounded-lg flex items-center justify-center border border-hairline/50">
                        <UserIcon className="w-5 h-5 text-primary" />
                   </div>
                )}

                <div>
                   {title ? (
                       <h1 className="text-sm font-bold tracking-wide uppercase text-cream">{title}</h1>
                   ) : (
                       <div className="flex flex-col">
                           <span className="text-[10px] uppercase tracking-wider text-latte font-semibold">فني</span>
                           <span className="text-sm font-bold text-cream">{technicianName || 'غير معروف'}</span>
                       </div>
                   )}
                </div>
            </div>

            <button
                onClick={onLogout}
                className="text-xs font-medium text-ember-500 hover:text-ember-400 px-3 py-1.5 rounded-full hover:bg-ember-500/10 transition-colors"
            >
                تسجيل الخروج
            </button>
        </div>

        {/* Progress Bar (if step provided) */}
        {step && totalSteps && (
            <div className="h-1 w-full bg-espresso-light">
                <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                />
            </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 relative z-10 w-full">
         {children}
      </main>

    </div>
  );
};

export default TechnicianLayout;
