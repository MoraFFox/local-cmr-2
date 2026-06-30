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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500/30">
      {/* Background Grid Pattern (Subtle) */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {onBack ? (
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors rounded-full active:bg-slate-800">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                ) : (
                   <div className="w-9 h-9 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700/50">
                        <UserIcon className="w-5 h-5 text-teal-500" />
                   </div>
                )}
                
                <div>
                   {title ? (
                       <h1 className="text-sm font-bold tracking-wide uppercase text-slate-200">{title}</h1>
                   ) : (
                       <div className="flex flex-col">
                           <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Operator</span>
                           <span className="text-sm font-bold text-slate-200">{technicianName || 'Unknown'}</span>
                       </div>
                   )}
                </div>
            </div>

            <button 
                onClick={onLogout}
                className="text-xs font-medium text-red-500 hover:text-red-400 px-3 py-1.5 rounded-full hover:bg-red-500/10 transition-colors"
            >
                LOGOUT
            </button>
        </div>

        {/* Progress Bar (if step provided) */}
        {step && totalSteps && (
            <div className="h-0.5 w-full bg-slate-800">
                <div 
                    className="h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)] transition-all duration-500 ease-out"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                />
            </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 relative z-10 w-full mb-20">
         {children}
      </main>

    </div>
  );
};

export default TechnicianLayout;
