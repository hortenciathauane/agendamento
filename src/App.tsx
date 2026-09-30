import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { BookingCalendar } from './components/client/BookingCalendar';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { 
  Appointment, 
  BlockedSlot, 
  BusinessConfig, 
  Service 
} from './types';
import { 
  getAppointments, 
  getBlockedSlots, 
  getBusinessConfig, 
  getServices, 
  subscribeToDbChanges 
} from './lib/supabaseClient';
import { INITIAL_BUSINESS_CONFIG } from './lib/seedData';

export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'home' | 'client-booking' | 'admin-login' | 'admin-dashboard'>('home');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('studio_admin_logged') === 'true';
  });

  // Database Data States
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>(INITIAL_BUSINESS_CONFIG);
  
  // Quick pre-selected service when clicking "Agendar" directly on a service card
  const [bookingServiceId, setBookingServiceId] = useState<string | undefined>(undefined);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    try {
      const [s, a, b, c] = await Promise.all([
        getServices(),
        getAppointments(),
        getBlockedSlots(),
        getBusinessConfig(),
      ]);
      setServices(s);
      setAppointments(a);
      setBlockedSlots(b);
      setBusinessConfig(c);
    } catch (err) {
      console.error('Error loading salon database:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to internal DB changes
    const unsubscribe = subscribeToDbChanges(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Count pending appointments
  const pendingCount = useMemo(() => {
    return appointments.filter(a => a.status === 'pendente').length;
  }, [appointments]);

  // Auth Handlers
  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('studio_admin_logged', 'true');
    setCurrentView('admin-dashboard');
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('studio_admin_logged');
    setCurrentView('home');
  };

  const handleSelectServiceFromLanding = (serviceId: string) => {
    setBookingServiceId(serviceId);
    setCurrentView('client-booking');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col antialiased selection:bg-rose-200">
      
      {/* Main Top Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'admin-dashboard' && !isAdminLoggedIn) {
            setCurrentView('admin-login');
          } else {
            setCurrentView(view);
          }
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogoutAdmin={handleLogout}
        pendingCount={pendingCount}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {currentView === 'home' && (
          <LandingHero
            onOpenClientBooking={() => {
              setBookingServiceId(undefined);
              setCurrentView('client-booking');
            }}
            onOpenAdminLogin={() => {
              if (isAdminLoggedIn) {
                setCurrentView('admin-dashboard');
              } else {
                setCurrentView('admin-login');
              }
            }}
            services={services}
            onSelectServiceToBook={handleSelectServiceFromLanding}
          />
        )}

        {currentView === 'client-booking' && (
          <BookingCalendar
            services={services}
            appointments={appointments}
            blockedSlots={blockedSlots}
            businessConfig={businessConfig}
            initialServiceId={bookingServiceId}
            onAppointmentCreated={() => {
              loadData();
            }}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'admin-login' && (
          <AdminLogin
            onLoginSuccess={handleLoginSuccess}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            services={services}
            appointments={appointments}
            blockedSlots={blockedSlots}
            businessConfig={businessConfig}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* Site Footer */}
      <footer className="border-t border-stone-200 bg-white/70 py-8 px-4 sm:px-6 lg:px-8 text-xs text-stone-700">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-stone-900">Studio Bella Concept</span>
            <span>·</span>
            <span>Agendamento para Cabeleireira</span>
          </div>

          <div className="flex items-center gap-4 text-stone-700">
            <span>Av. das Flores, 850 · São Paulo</span>
            <span>·</span>
            <span>WhatsApp: (11) 98765-4321</span>
          </div>

          <div className="text-stone-700">
            © {new Date().getFullYear()} Studio Bella. Todos os direitos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}
