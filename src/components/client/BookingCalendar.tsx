import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Sparkles, 
  MessageSquare, 
  ArrowLeft,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Appointment, BlockedSlot, BusinessConfig, Service } from '../../types';
import { 
  calculateAvailableSlots, 
  formatDatePortuguese, 
  getDayOfWeekFromDateString, 
  getTodayDateString 
} from '../../lib/dateUtils';
import { createAppointment } from '../../lib/supabaseClient';
import { getWhatsAppDirectLink, sanitizeWhatsAppNumber, sendWhatsAppBusinessMessage } from '../../lib/whatsappApi';

interface BookingCalendarProps {
  services: Service[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  businessConfig: BusinessConfig;
  initialServiceId?: string;
  onAppointmentCreated: (apt: Appointment) => void;
  onBackToHome: () => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  services,
  appointments,
  blockedSlots,
  businessConfig,
  initialServiceId,
  onAppointmentCreated,
  onBackToHome,
}) => {
  // Wizard steps: 1: Service, 2: Date & Time, 3: Client Info, 4: Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(initialServiceId ? 2 : 1);
  
  // Selection state
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || (services[0]?.id ?? ''));
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Client Info state
  const [clientName, setClientName] = useState<string>('');
  const [clientWhatsapp, setClientWhatsapp] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // UI states
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  // Month navigation for calendar picker
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

  // Filter active services
  const activeServices = useMemo(() => services.filter(s => s.active), [services]);
  const selectedService = useMemo(() => 
    services.find(s => s.id === selectedServiceId) || services[0], 
    [services, selectedServiceId]
  );

  // Available slots for the selected date and service
  const daySchedule = useMemo(() => {
    const dayOfWeek = getDayOfWeekFromDateString(selectedDate);
    return businessConfig.schedules.find(s => s.dayOfWeek === dayOfWeek) || businessConfig.schedules[0];
  }, [selectedDate, businessConfig]);

  const slots = useMemo(() => {
    if (!selectedService) return [];
    return calculateAvailableSlots(
      selectedDate,
      selectedService.durationMinutes,
      daySchedule,
      appointments,
      blockedSlots,
      businessConfig.slotIntervalMinutes || 30
    );
  }, [selectedDate, selectedService, daySchedule, appointments, blockedSlots, businessConfig]);

  // Phone number mask formatter
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setClientWhatsapp(formatted);
  };

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isPast: boolean; isClosed: boolean }[] = [];
    const todayStr = getTodayDateString();

    // Fill days of month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const schedule = businessConfig.schedules.find(s => s.dayOfWeek === dayOfWeek);
      const isPast = dStr < todayStr;
      const isClosed = !schedule?.isOpen || blockedSlots.some(b => b.date === dStr && (!b.time || b.time.trim() === ''));

      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isPast,
        isClosed,
      });
    }

    return { firstDay, days, monthName: viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) };
  }, [viewDate, businessConfig, blockedSlots]);

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handlePrevMonth = () => {
    const now = new Date();
    // Prevent navigating to past months
    if (viewDate.getFullYear() > now.getFullYear() || viewDate.getMonth() > now.getMonth()) {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    }
  };

  // Submission handler
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedService) {
      setErrorMsg('Por favor, selecione um serviço.');
      setCurrentStep(1);
      return;
    }
    if (!selectedDate || !selectedTime) {
      setErrorMsg('Por favor, escolha uma data e um horário disponível.');
      setCurrentStep(2);
      return;
    }
    if (!clientName.trim()) {
      setErrorMsg('O nome completo da cliente é obrigatório.');
      return;
    }

    const cleanPhone = sanitizeWhatsAppNumber(clientWhatsapp);
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Informe um número de WhatsApp válido com DDD (ex: 11 99999-9999).');
      return;
    }

    // Verify once more that slot is not occupied
    const activeSlot = slots.find(s => s.time === selectedTime);
    if (activeSlot && !activeSlot.available) {
      setErrorMsg(`O horário das ${selectedTime} não está mais disponível (${activeSlot.reason}). Escolha outro horário.`);
      setCurrentStep(2);
      return;
    }

    try {
      setIsSubmitting(true);

      // Create appointment in database with status 'pendente'
      const newApt = await createAppointment({
        clientName: clientName.trim(),
        clientWhatsapp: clientWhatsapp.trim(),
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        serviceDuration: selectedService.durationMinutes,
        date: selectedDate,
        time: selectedTime,
        status: 'pendente',
        notes: notes.trim(),
      });

      // Send automated WhatsApp message: "aguardando aprovação"
      await sendWhatsAppBusinessMessage(newApt, 'solicitacao_pendente', {
        salonName: businessConfig.salonName,
      });

      setCreatedAppointment(newApt);
      onAppointmentCreated(newApt);
      setCurrentStep(4);
    } catch (err) {
      console.error(err);
      setErrorMsg('Ocorreu um erro ao registrar sua solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset booking form
  const handleResetBooking = () => {
    setCurrentStep(1);
    setSelectedTime('');
    setClientName('');
    setClientWhatsapp('');
    setNotes('');
    setCreatedAppointment(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      
      {/* Header & Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Página Inicial</span>
        </button>

        {currentStep < 4 && (
          <div className="flex items-center gap-1.5 text-xs text-stone-700">
            <span className={currentStep === 1 ? 'font-bold text-rose-900' : ''}>1. Serviço</span>
            <span>·</span>
            <span className={currentStep === 2 ? 'font-bold text-rose-900' : ''}>2. Data & Horário</span>
            <span>·</span>
            <span className={currentStep === 3 ? 'font-bold text-rose-900' : ''}>3. Seus Dados</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Atenção</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STEP 1: SELECIONAR SERVIÇO */}
      {/* ---------------------------------------------------- */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold tracking-wider text-rose-800 uppercase">Passo 1 de 3</span>
            <h2 className="font-serif text-3xl font-medium text-stone-900 mt-1">
              Escolha o Serviço Desejado
            </h2>
            <p className="text-xs sm:text-sm text-stone-700 mt-1">
              Selecione o procedimento para o qual deseja agendar seu horário.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeServices.map((service) => {
              const isSelected = selectedServiceId === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                    isSelected
                      ? 'bg-rose-50/70 border-rose-900 ring-2 ring-rose-900/20 shadow-sm'
                      : 'bg-white border-stone-200 hover:border-stone-400 hover:shadow-sm'
                  }`}
                >
                  <img
                    src={service.image}
                    alt={service.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wide">
                          {service.category}
                        </span>
                        <span className="text-xs font-bold text-stone-900 font-mono">
                          R$ {service.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <h3 className="font-serif text-base font-bold text-stone-900 mt-0.5 leading-snug">
                        {service.name}
                      </h3>
                      <p className="text-xs text-stone-700 mt-1 line-clamp-2">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-stone-700">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-stone-600" />
                        {service.durationMinutes} minutos
                      </span>
                      <span className={`text-xs font-semibold ${isSelected ? 'text-rose-900' : 'text-stone-600'}`}>
                        {isSelected ? '✓ Selecionado' : 'Selecionar'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => {
                if (!selectedServiceId) {
                  setErrorMsg('Escolha um serviço antes de avançar.');
                  return;
                }
                setErrorMsg('');
                setCurrentStep(2);
              }}
              className="py-3 px-6 bg-stone-900 hover:bg-rose-950 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Avançar para Data & Horário</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STEP 2: SELECIONAR DATA E HORÁRIO DISPONÍVEL */}
      {/* ---------------------------------------------------- */}
      {currentStep === 2 && (
        <div className="space-y-8">
          <div>
            <span className="text-xs font-semibold tracking-wider text-rose-800 uppercase">Passo 2 de 3</span>
            <h2 className="font-serif text-3xl font-medium text-stone-900 mt-1">
              Data & Horários Disponíveis
            </h2>
            <p className="text-xs sm:text-sm text-stone-700 mt-1">
              Serviço selecionado: <strong>{selectedService?.name}</strong> ({selectedService?.durationMinutes} min · R$ {selectedService?.price.toFixed(2).replace('.', ',')})
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Custom Interactive Calendar (7 Cols) */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-serif text-base font-bold capitalize text-stone-900">
                  {calendarDays.monthName}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-stone-700 uppercase">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty placeholders before 1st of month */}
                {Array.from({ length: calendarDays.firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 sm:h-10" />
                ))}

                {calendarDays.days.map((d) => {
                  const isSelected = selectedDate === d.dateStr;
                  const isDisabled = d.isPast || d.isClosed;

                  return (
                    <button
                      key={d.dateStr}
                      disabled={isDisabled}
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setSelectedTime(''); // Reset time selection on date switch
                        setErrorMsg('');
                      }}
                      className={`h-9 sm:h-10 rounded-xl text-xs font-medium transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                        isDisabled
                          ? 'text-stone-300 bg-stone-50 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-rose-950 text-white font-bold shadow-sm'
                          : 'text-stone-800 hover:bg-rose-50 hover:text-rose-950'
                      }`}
                    >
                      <span>{d.dayNumber}</span>
                      {d.isClosed && !d.isPast && (
                        <span className="text-[9px] text-stone-600 leading-none">Fechado</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-950" />
                  <span>Selecionado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                  <span>Indisponível / Fechado</span>
                </div>
              </div>
            </div>

            {/* Available Time Slots Grid (6 Cols) */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-base font-bold text-stone-900">
                    Horários para {formatDatePortuguese(selectedDate)}
                  </h3>
                  <span className="text-xs text-stone-700 font-mono">
                    {slots.filter(s => s.available).length} livres
                  </span>
                </div>

                {!daySchedule.isOpen ? (
                  <div className="p-8 text-center bg-stone-50 rounded-xl space-y-2">
                    <ShieldAlert className="w-6 h-6 text-stone-400 mx-auto" />
                    <p className="text-xs font-semibold text-stone-700">Salão fechado neste dia da semana.</p>
                    <p className="text-[11px] text-stone-700">Por favor, escolha uma data entre terça-feira e sábado.</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-xl space-y-2">
                    <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                    <p className="text-xs font-semibold text-stone-700">Nenhum horário disponível para esta data.</p>
                    <p className="text-[11px] text-stone-700">Todos os horários estão preenchidos ou bloqueados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => {
                            if (slot.available) {
                              setSelectedTime(slot.time);
                              setErrorMsg('');
                            }
                          }}
                          title={!slot.available ? slot.reason : 'Clique para selecionar'}
                          className={`py-2 px-2 rounded-xl text-xs font-medium font-mono text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            !slot.available
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/60'
                              : isSelected
                              ? 'bg-stone-900 text-white font-bold shadow-sm ring-2 ring-stone-900/30'
                              : 'bg-stone-50 hover:bg-rose-50 text-stone-800 border border-stone-200 hover:border-rose-300'
                          }`}
                        >
                          <span className="text-xs font-bold">{slot.time}</span>
                          {!slot.available ? (
                            <span className="text-[9px] text-stone-600 truncate max-w-full">
                              Ocupado
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-800">
                              Livre
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Slot Summary Indicator */}
              {selectedTime && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Horário escolhido: <strong>{selectedTime}</strong> ({selectedService?.durationMinutes} min)</span>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedTime) {
                      setErrorMsg('Por favor, selecione um horário disponível na lista.');
                      return;
                    }
                    setErrorMsg('');
                    setCurrentStep(3);
                  }}
                  className="py-2.5 px-5 bg-stone-900 hover:bg-rose-950 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Preencher Meus Dados</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STEP 3: DADOS DA CLIENTE & CONFIRMAÇÃO */}
      {/* ---------------------------------------------------- */}
      {currentStep === 3 && (
        <div className="space-y-8">
          <div>
            <span className="text-xs font-semibold tracking-wider text-rose-800 uppercase">Passo 3 de 3</span>
            <h2 className="font-serif text-3xl font-medium text-stone-900 mt-1">
              Confirme seus Dados
            </h2>
            <p className="text-xs sm:text-sm text-stone-700 mt-1">
              Informe seu nome e WhatsApp para receber as confirmações automáticas do Studio Bella.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Form */}
            <form onSubmit={handleSubmitBooking} className="md:col-span-7 bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-stone-500" />
                  <span>Nome Completo *</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Mariana Silveira"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-800/20 focus:border-rose-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Número de WhatsApp (Obrigatório) *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={clientWhatsapp}
                  onChange={handlePhoneChange}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-rose-800/20 focus:border-rose-800 transition-all"
                />
                <p className="text-[11px] text-stone-700 mt-1">
                  Enviaremos o status do seu agendamento diretamente no seu WhatsApp através da API Oficial.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  <span>Observações (Opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Tenho alergia a cheiros fortes, meu cabelo tem tintura preta prévia, etc."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-800/20 focus:border-rose-800 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Enviando solicitação...</span>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      <span>Enviar Solicitação de Agendamento</span>
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Summary Card */}
            <div className="md:col-span-5 bg-stone-100/80 p-5 rounded-2xl border border-stone-200/90 space-y-4">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Resumo da Sua Reserva
              </h3>

              <div className="space-y-3 text-xs text-stone-700">
                <div className="flex justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-700">Serviço:</span>
                  <span className="font-semibold text-stone-900 text-right">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-700">Duração estimada:</span>
                  <span className="font-mono font-medium text-stone-900">{selectedService?.durationMinutes} min</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-700">Data:</span>
                  <span className="font-medium text-stone-900">{formatDatePortuguese(selectedDate)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-700">Horário:</span>
                  <span className="font-mono font-bold text-rose-950 text-sm">{selectedTime}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-700">Valor do serviço:</span>
                  <span className="font-mono font-bold text-stone-900 text-sm">
                    R$ {selectedService?.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200 text-[11px] text-stone-700 space-y-1">
                <p className="font-bold text-stone-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Como funciona a aprovação?
                </p>
                <p>
                  Ao enviar, a cabeleireira recebe sua solicitação na agenda e você recebe uma mensagem no WhatsApp confirmando o recebimento. Assim que ela aprovar, você recebe o aviso imediato com todos os detalhes.
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STEP 4: SUCESSO & WHATSAPP TRIGGER PREVIEW */}
      {/* ---------------------------------------------------- */}
      {currentStep === 4 && createdAppointment && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-stone-200/90 shadow-lg text-center space-y-6 animate-fadeIn">
          
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              ⏳ Status: Aguardando Aprovação
            </span>
            <h2 className="font-serif text-3xl font-medium text-stone-900">
              Solicitação Enviada com Sucesso!
            </h2>
            <p className="text-xs sm:text-sm text-stone-700 max-w-md mx-auto">
              Obrigada, <strong>{createdAppointment.clientName}</strong>! Seu pedido foi encaminhado para a cabeleireira <strong>{businessConfig.hairdresserName}</strong>.
            </p>
          </div>

          {/* WhatsApp Confirmation Notification Box */}
          <div className="bg-[#EBF7EE] border border-emerald-300/80 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between text-xs text-emerald-900">
              <span className="flex items-center gap-1.5 font-bold">
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                Mensagem de Confirmação Enviada no WhatsApp
              </span>
              <span className="font-mono text-[10px] text-emerald-700">Enviada</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 text-xs text-stone-800 font-sans leading-relaxed shadow-xs">
              <p>
                Olá <strong>{createdAppointment.clientName}</strong>! ✨ Recebemos seu pedido de agendamento para <strong>{createdAppointment.serviceName}</strong> no dia <strong>{createdAppointment.date}</strong> às <strong>{createdAppointment.time}</strong>. No momento seu agendamento está <em>aguardando aprovação</em> da cabeleireira. Avisaremos assim que for confirmado!
              </p>
            </div>

            <p className="text-[11px] text-emerald-800">
              Número destinatário: <strong className="font-mono">{createdAppointment.clientWhatsapp}</strong>
            </p>
          </div>

          {/* Appointment details summary */}
          <div className="grid grid-cols-2 gap-3 text-left text-xs bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div>
              <span className="text-stone-700 block">Serviço:</span>
              <span className="font-semibold text-stone-900">{createdAppointment.serviceName}</span>
            </div>
            <div>
              <span className="text-stone-700 block">Valor:</span>
              <span className="font-semibold text-stone-900 font-mono">
                R$ {createdAppointment.servicePrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div>
              <span className="text-stone-700 block">Data e Horário:</span>
              <span className="font-semibold text-stone-900">
                {createdAppointment.date} às {createdAppointment.time}
              </span>
            </div>
            <div>
              <span className="text-stone-700 block">Local:</span>
              <span className="font-semibold text-stone-900">{businessConfig.salonName}</span>
            </div>
          </div>

          {/* Direct WhatsApp button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={getWhatsAppDirectLink(
                createdAppointment.clientWhatsapp,
                `Olá, fiz um pedido de agendamento para ${createdAppointment.serviceName} às ${createdAppointment.time} no dia ${createdAppointment.date}!`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Abrir Conversa no WhatsApp</span>
            </a>

            <button
              onClick={handleResetBooking}
              className="w-full sm:w-auto py-3 px-5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Fazer Outro Agendamento
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
