import React from 'react';
import { Calendar, Shield, MessageSquare, Scissors, Clock } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'client-booking' | 'admin-login' | 'admin-dashboard';
  onNavigate: (view: 'home' | 'client-booking' | 'admin-login' | 'admin-dashboard') => void;
  isAdminLoggedIn: boolean;
  onLogoutAdmin: () => void;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  isAdminLoggedIn,
  onLogoutAdmin,
  pendingCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand wordmark (single text element) */}
        <button 
          onClick={() => onNavigate('home')} 
          className="group flex items-center gap-2 text-left cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-full bg-stone-900 text-amber-100 flex items-center justify-center font-serif text-lg font-bold shadow-sm">
            B
          </div>
          <div>
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 group-hover:text-rose-950 transition-colors">
              Studio Bella
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-stone-700 tracking-wider uppercase">
              Cabeleireira
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-700">
          <button 
            onClick={() => onNavigate('home')}
            className={`cursor-pointer transition-colors hover:text-stone-900 ${currentView === 'home' ? 'text-stone-900 font-semibold' : ''}`}
          >
            Início
          </button>
          <button 
            onClick={() => onNavigate('client-booking')}
            className={`cursor-pointer transition-colors hover:text-stone-900 ${currentView === 'client-booking' ? 'text-stone-900 font-semibold' : ''}`}
          >
            Agendamento Online
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Client Booking shortcut */}
          <button
            onClick={() => onNavigate('client-booking')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'client-booking'
                ? 'bg-rose-950 text-white shadow-sm'
                : 'bg-stone-900 text-stone-50 hover:bg-rose-950 shadow-sm'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden xs:inline">Agendar</span> Horário
          </button>

          {/* Admin Switcher */}
          {isAdminLoggedIn ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('admin-dashboard')}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'admin-dashboard'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300/80 font-semibold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Painel</span>
                {pendingCount > 0 && (
                  <span className="w-5 h-5 text-[11px] font-bold bg-rose-600 text-white rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={onLogoutAdmin}
                className="text-xs text-stone-500 hover:text-rose-700 px-2 py-1 transition-colors cursor-pointer"
                title="Sair do painel administrativo"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('admin-login')}
              className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer border flex items-center gap-1.5 ${
                currentView === 'admin-login'
                  ? 'bg-stone-200 text-stone-900 border-stone-300'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300/80'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-stone-500" />
              <span>Área da Cabeleireira</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
