import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  User, 
  Phone, 
  AlertCircle, 
  Ban, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Tag,
  DollarSign
} from 'lucide-react';
import { 
  Appointment, 
  AppointmentStatus, 
  BlockedSlot, 
  BusinessConfig, 
  Service 
} from '../../types';
import { 
  formatDatePortuguese, 
  formatDateShort, 
  getTodayDateString 
} from '../../lib/dateUtils';
import { 
  addBlockedSlot, 
  createAppointment, 
  deleteAppointment, 
  deleteService, 
  removeBlockedSlot, 
  saveBusinessConfig, 
  saveService, 
  updateAppointment, 
  updateAppointmentStatus 
} from '../../lib/supabaseClient';
import { 
  formatDateBR, 
  getWhatsAppDirectLink, 
  sendWhatsAppBusinessMessage 
} from '../../lib/whatsappApi';

interface AdminDashboardProps {
  services: Service[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  businessConfig: BusinessConfig;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  services,
  appointments,
  blockedSlots,
  businessConfig,
  onRefreshData,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'pendentes' | 'agenda' | 'servicos' | 'horarios' | 'historico'>('pendentes');

  // Synchronized appointments state for instant UI responsiveness
  const [localAppointments, setLocalAppointments] = useState<Appointment[]>(appointments);

  React.useEffect(() => {
    setLocalAppointments(appointments);
  }, [appointments]);

  // Filter & Search states
  const [agendaDate, setAgendaDate] = useState<string>(getTodayDateString());
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [showRejectModal, setShowRejectModal] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  
  const [showNewAptModal, setShowNewAptModal] = useState<boolean>(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);

  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [blockDate, setBlockDate] = useState<string>(getTodayDateString());
  const [blockTime, setBlockTime] = useState<string>('');
  const [blockReason, setBlockReason] = useState<string>('Compromisso Pessoal / Curso');
  const [blockWholeDay, setBlockWholeDay] = useState<boolean>(false);

  // Show quick notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Pending appointments list
  const pendingAppointments = useMemo(() => {
    return localAppointments
      .filter(a => a.status === 'pendente')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [localAppointments]);

  // Appointments for the selected day in Agenda view
  const dayAppointments = useMemo(() => {
    return localAppointments
      .filter(a => a.date === agendaDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [localAppointments, agendaDate]);

  // Filtered History list
  const filteredHistory = useMemo(() => {
    return localAppointments.filter(a => {
      const matchSearch = 
        a.clientName.toLowerCase().includes(historySearch.toLowerCase()) ||
        a.clientWhatsapp.includes(historySearch) ||
        a.serviceName.toLowerCase().includes(historySearch.toLowerCase()) ||
        a.date.includes(historySearch);

      const matchStatus = historyStatusFilter === 'all' || a.status === historyStatusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [localAppointments, historySearch, historyStatusFilter]);

  // ----------------------------------------------------
  // ACTION: APROVAR AGENDAMENTO
  // ----------------------------------------------------
  const handleApprove = async (apt: Appointment) => {
    // 1. Optimistic update: instantly reflect status change in UI
    setLocalAppointments(prev => 
      prev.map(a => a.id === apt.id ? { ...a, status: 'confirmado' as AppointmentStatus } : a)
    );

    try {
      // 2. Persist update in database (Supabase & LocalStorage)
      await updateAppointmentStatus(apt.id, 'confirmado');

      // 3. Send automated WhatsApp message: "Agendamento confirmado, Serviço, Data, Horário"
      await sendWhatsAppBusinessMessage(
        { ...apt, status: 'confirmado' },
        'agendamento_confirmado',
        { salonName: businessConfig.salonName }
      );

      triggerToast(`Agendamento de ${apt.clientName} APROVADO!`);
      onRefreshData();
    } catch (e) {
      console.error('Erro ao aprovar:', e);
      triggerToast('Erro ao atualizar banco de dados.');
      onRefreshData();
    }
  };

  // ----------------------------------------------------
  // ACTION: RECUSAR AGENDAMENTO
  // ----------------------------------------------------
  const handleConfirmReject = async () => {
    if (!showRejectModal) return;
    const apt = showRejectModal;
    const reasonText = rejectionReason.trim() || 'Horário indisponível';

    // 1. Optimistic update
    setLocalAppointments(prev => 
      prev.map(a => a.id === apt.id ? { ...a, status: 'cancelado' as AppointmentStatus, rejectionReason: reasonText } : a)
    );

    try {
      // 2. Update status in database to 'cancelado'
      await updateAppointmentStatus(apt.id, 'cancelado', reasonText);

      // 3. Send automated WhatsApp message informing request was not approved
      await sendWhatsAppBusinessMessage(
        { ...apt, status: 'cancelado', rejectionReason: reasonText },
        'agendamento_recusado',
        { rejectionReason: reasonText, salonName: businessConfig.salonName }
      );

      triggerToast(`Solicitação de ${apt.clientName} RECUSADA.`);
      setShowRejectModal(null);
      setRejectionReason('');
      onRefreshData();
    } catch (e) {
      console.error(e);
      triggerToast('Erro ao recusar solicitação.');
      onRefreshData();
    }
  };

  // ----------------------------------------------------
  // ACTION: CONCLUIR AGENDAMENTO
  // ----------------------------------------------------
  const handleComplete = async (apt: Appointment) => {
    setLocalAppointments(prev => 
      prev.map(a => a.id === apt.id ? { ...a, status: 'concluido' as AppointmentStatus } : a)
    );

    try {
      await updateAppointmentStatus(apt.id, 'concluido');
      await sendWhatsAppBusinessMessage(
        { ...apt, status: 'concluido' },
        'agendamento_concluido',
        { salonName: businessConfig.salonName }
      );
      triggerToast(`Atendimento de ${apt.clientName} marcado como CONCLUÍDO!`);
      onRefreshData();
    } catch (e) {
      console.error(e);
      onRefreshData();
    }
  };

  // ----------------------------------------------------
  // ACTION: CANCELAR AGENDAMENTO
  // ----------------------------------------------------
  const handleCancelApt = async (apt: Appointment) => {
    if (!window.confirm(`Deseja realmente cancelar o agendamento de ${apt.clientName}?`)) return;

    setLocalAppointments(prev => 
      prev.map(a => a.id === apt.id ? { ...a, status: 'cancelado' as AppointmentStatus } : a)
    );

    try {
      await updateAppointmentStatus(apt.id, 'cancelado', 'Cancelado pela administração');
      await sendWhatsAppBusinessMessage(
        { ...apt, status: 'cancelado' },
        'agendamento_cancelado',
        { salonName: businessConfig.salonName }
      );
      triggerToast(`Agendamento de ${apt.clientName} cancelado.`);
      onRefreshData();
    } catch (e) {
      console.error(e);
      onRefreshData();
    }
  };

  // ----------------------------------------------------
  // ACTION: EXCLUIR AGENDAMENTO
  // ----------------------------------------------------
  const handleDeleteApt = async (aptId: string) => {
    if (!window.confirm('Excluir este agendamento do histórico permanentemente?')) return;
    setLocalAppointments(prev => prev.filter(a => a.id !== aptId));
    await deleteAppointment(aptId);
    triggerToast('Agendamento excluído.');
    onRefreshData();
  };

  // ----------------------------------------------------
  // ACTION: BLOQUEIO DE HORÁRIOS / DIAS
  // ----------------------------------------------------
  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;

    await addBlockedSlot({
      date: blockDate,
      time: blockWholeDay ? undefined : blockTime,
      reason: blockReason || 'Bloqueio administrativo',
    });

    triggerToast(`Bloqueio adicionado com sucesso para ${formatDateBR(blockDate)}.`);
    setShowBlockModal(false);
    setBlockTime('');
    setBlockReason('Compromisso Pessoal / Curso');
    setBlockWholeDay(false);
    onRefreshData();
  };

  const handleRemoveBlock = async (id: string) => {
    await removeBlockedSlot(id);
    triggerToast('Bloqueio removido.');
    onRefreshData();
  };

  // Status Badge Helper
  const renderStatus = (status: AppointmentStatus) => {
    switch (status) {
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pendente
          </span>
        );
      case 'confirmado':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Confirmado
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
            <Check className="w-3.5 h-3.5 text-sky-600" />
            Concluído
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full line-through">
            <XCircle className="w-3.5 h-3.5 text-stone-500" />
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-2xl bg-stone-900 text-white text-xs sm:text-sm shadow-xl flex items-center gap-3 animate-slideDown">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Header Banner */}
      <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 text-amber-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Painel da Cabeleireira · {businessConfig.salonName}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            Olá, {businessConfig.hairdresserName}!
          </h1>
          <p className="text-xs sm:text-sm text-stone-400">
            Você tem <strong>{pendingAppointments.length} solicitação(ões) pendente(s)</strong> aguardando sua aprovação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowNewAptModal(true)}
            className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
          <button
            onClick={() => setShowBlockModal(true)}
            className="py-2.5 px-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Ban className="w-4 h-4 text-rose-400" />
            <span>Bloquear Horário</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-stone-200/80 rounded-2xl overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'pendentes'
              ? 'bg-white text-stone-900 font-bold shadow-xs'
              : 'text-stone-700 hover:text-stone-950'
          }`}
        >
          <span>Solicitações Pendentes</span>
          {pendingAppointments.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center">
              {pendingAppointments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('agenda')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'agenda'
              ? 'bg-white text-stone-900 font-bold shadow-xs'
              : 'text-stone-700 hover:text-stone-950'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
          <span>Agenda & Calendário</span>
        </button>

        <button
          onClick={() => setActiveTab('servicos')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'servicos'
              ? 'bg-white text-stone-900 font-bold shadow-xs'
              : 'text-stone-700 hover:text-stone-950'
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-stone-500" />
          <span>Gerenciar Serviços</span>
        </button>

        <button
          onClick={() => setActiveTab('horarios')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'horarios'
              ? 'bg-white text-stone-900 font-bold shadow-xs'
              : 'text-stone-700 hover:text-stone-950'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-stone-500" />
          <span>Horários & Bloqueios</span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'historico'
              ? 'bg-white text-stone-900 font-bold shadow-xs'
              : 'text-stone-700 hover:text-stone-950'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-stone-500" />
          <span>Histórico de Clientes</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: SOLICITAÇÕES PENDENTES */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'pendentes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                Novas Solicitações de Agendamento
              </h2>
              <p className="text-xs text-stone-700">
                Aprove para confirmar o horário e disparar automaticamente o WhatsApp para a cliente, ou recuse com justificativa.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-stone-700">
              {pendingAppointments.length} aguardando
            </span>
          </div>

          {pendingAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/90 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Tudo em dia!
              </h3>
              <p className="text-xs text-stone-700 max-w-sm mx-auto">
                Não há nenhuma nova solicitação pendente no momento. Os novos agendamentos feitos pelas clientes aparecerão aqui instantaneamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAppointments.map((apt) => (
                <div 
                  key={apt.id}
                  className="bg-white rounded-2xl p-5 border border-amber-300 shadow-sm space-y-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-stone-700 uppercase tracking-wide">
                        Recebido em {formatDateShort(apt.createdAt.split('T')[0])}
                      </span>
                      <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                        {apt.clientName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={getWhatsAppDirectLink(apt.clientWhatsapp, `Olá ${apt.clientName}, aqui é a Isabella do Studio Bella!`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{apt.clientWhatsapp}</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    </div>

                    {renderStatus(apt.status)}
                  </div>

                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-stone-700">Serviço:</span>
                      <strong className="text-stone-900">{apt.serviceName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-700">Data & Horário:</span>
                      <strong className="text-rose-950 font-mono">
                        {formatDatePortuguese(apt.date)} às {apt.time}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-700">Duração / Valor:</span>
                      <span className="font-mono text-stone-900">
                        {apt.serviceDuration} min · R$ {apt.servicePrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {apt.notes && (
                      <div className="pt-1.5 border-t border-stone-200 text-stone-700">
                        <span className="font-semibold text-stone-800">Obs da cliente:</span> {apt.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions: Approve or Reject */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(apt)}
                      className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprovar & Notificar WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowRejectModal(apt);
                        setRejectionReason('Horário indisponível por motivo de agenda cheia.');
                      }}
                      className="py-2.5 px-3 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: AGENDA & CALENDÁRIO */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'agenda' && (
        <div className="space-y-6">
          
          {/* Day Navigator */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(agendaDate + 'T00:00:00');
                  d.setDate(d.getDate() - 1);
                  setAgendaDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setAgendaDate(getTodayDateString())}
                className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 cursor-pointer"
              >
                Hoje
              </button>

              <button
                onClick={() => {
                  const d = new Date(agendaDate + 'T00:00:00');
                  d.setDate(d.getDate() + 1);
                  setAgendaDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={agendaDate}
                onChange={(e) => setAgendaDate(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono text-stone-900 cursor-pointer"
              />
            </div>

            <div className="font-serif text-lg font-bold text-stone-900 text-center sm:text-right">
              {formatDatePortuguese(agendaDate)}
            </div>

          </div>

          {/* Appointments on selected day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Agendamentos do Dia ({dayAppointments.length})
              </h3>
              <button
                onClick={() => {
                  setEditingApt(null);
                  setShowNewAptModal(true);
                }}
                className="text-xs font-semibold text-rose-900 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Horário</span>
              </button>
            </div>

            {dayAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200/90 text-stone-700 text-xs space-y-2">
                <Clock className="w-6 h-6 text-stone-400 mx-auto" />
                <p>Nenhum agendamento marcado para esta data.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-14 h-12 rounded-xl bg-stone-100 border border-stone-200 text-stone-900 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                        {apt.time}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-base font-bold text-stone-900">
                            {apt.clientName}
                          </h4>
                          {renderStatus(apt.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-700">
                          <span>{apt.serviceName} ({apt.serviceDuration} min)</span>
                          <span>·</span>
                          <span className="font-mono">R$ {apt.servicePrice.toFixed(2).replace('.', ',')}</span>
                          <span>·</span>
                          <a
                            href={getWhatsAppDirectLink(apt.clientWhatsapp, `Olá ${apt.clientName}!`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 font-mono hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {apt.clientWhatsapp}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Quick status actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {apt.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => handleApprove(apt)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => {
                              setShowRejectModal(apt);
                              setRejectionReason('Horário indisponível');
                            }}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Recusar
                          </button>
                        </>
                      )}

                      {apt.status === 'confirmado' && (
                        <button
                          onClick={() => handleComplete(apt)}
                          className="px-3 py-1.5 bg-sky-50 text-sky-800 hover:bg-sky-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Concluir</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingApt(apt);
                          setShowNewAptModal(true);
                        }}
                        className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Editar agendamento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {apt.status !== 'cancelado' && (
                        <button
                          onClick={() => handleCancelApt(apt)}
                          className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Cancelar agendamento"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: GERENCIAR SERVIÇOS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'servicos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                Catálogo de Serviços
              </h2>
              <p className="text-xs text-stone-700">
                Cadastre procedimentos, defina valores, tempos de execução e mantenha o cardápio sempre atualizado.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingService(null);
                setShowServiceModal(true);
              }}
              className="py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Serviço</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div 
                key={service.id}
                className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wide">
                      {service.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${service.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-700'}`}>
                      {service.active ? 'Ativo na Agenda' : 'Pausado'}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    {service.name}
                  </h3>

                  <p className="text-xs text-stone-700 line-clamp-3 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold font-mono text-stone-900">
                      R$ {service.price.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-[11px] text-stone-700 font-mono">
                      {service.durationMinutes} minutos de duração
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingService(service);
                        setShowServiceModal(true);
                      }}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar serviço"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Excluir o serviço "${service.name}"?`)) {
                          await deleteService(service.id);
                          triggerToast('Serviço excluído.');
                          onRefreshData();
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      title="Excluir serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: HORÁRIOS & BLOQUEIOS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'horarios' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                Horários de Atendimento & Bloqueios
              </h2>
              <p className="text-xs text-stone-700">
                Configure os dias de funcionamento e bloqueie datas específicas para folgas, feriados ou compromissos.
              </p>
            </div>
            <button
              onClick={() => setShowBlockModal(true)}
              className="py-2.5 px-4 bg-rose-950 hover:bg-rose-900 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Ban className="w-4 h-4" />
              <span>Bloquear Dia ou Horário</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Weekday Schedule Settings */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Dias de Funcionamento da Semana
              </h3>

              <div className="space-y-2">
                {businessConfig.schedules.map((sch, idx) => (
                  <div 
                    key={sch.dayOfWeek}
                    className="p-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={sch.isOpen}
                        onChange={async (e) => {
                          const updated = [...businessConfig.schedules];
                          updated[idx] = { ...sch, isOpen: e.target.checked };
                          await saveBusinessConfig({ ...businessConfig, schedules: updated });
                          onRefreshData();
                        }}
                        className="w-4 h-4 text-rose-900 rounded cursor-pointer"
                      />
                      <span className={`font-semibold ${sch.isOpen ? 'text-stone-900' : 'text-stone-400 line-through'}`}>
                        {sch.dayName}
                      </span>
                    </div>

                    {sch.isOpen ? (
                      <div className="flex items-center gap-2 font-mono text-stone-700">
                        <span>{sch.openTime} às {sch.closeTime}</span>
                        {sch.lunchBreakStart && (
                          <span className="text-[11px] text-stone-700">(Almoço: {sch.lunchBreakStart}-{sch.lunchBreakEnd})</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-stone-700 italic">Fechado</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Blocks List */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Bloqueios Ativos ({blockedSlots.length})
              </h3>

              {blockedSlots.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-700 bg-stone-50 rounded-xl">
                  Nenhum bloqueio cadastrado.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {blockedSlots.map((b) => (
                    <div 
                      key={b.id}
                      className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-xs flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-rose-950 font-mono">
                          {formatDateBR(b.date)} {b.time ? `às ${b.time}` : '(Dia inteiro)'}
                        </div>
                        <div className="text-stone-700 text-[11px]">
                          Motivo: {b.reason}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveBlock(b.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-700 transition-colors cursor-pointer"
                        title="Desbloquear"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 5: HISTÓRICO DE CLIENTES */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                Histórico Geral de Atendimentos
              </h2>
              <p className="text-xs text-stone-700">
                Consulte agendamentos passados e futuros com filtros por cliente e status.
              </p>
            </div>

            {/* Search and status filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar cliente, WhatsApp..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-900/20"
                />
              </div>

              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Data & Horário</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">WhatsApp</th>
                    <th className="py-3 px-4">Serviço</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredHistory.map((apt) => (
                    <tr key={apt.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-stone-900 whitespace-nowrap">
                        {formatDateBR(apt.date)} às {apt.time}
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        {apt.clientName}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 whitespace-nowrap">
                        <a
                          href={getWhatsAppDirectLink(apt.clientWhatsapp, `Olá ${apt.clientName}!`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{apt.clientWhatsapp}</span>
                        </a>
                      </td>
                      <td className="py-3 px-4 text-stone-800">
                        {apt.serviceName}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                        R$ {apt.servicePrice.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatus(apt.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingApt(apt);
                              setShowNewAptModal(true);
                            }}
                            className="p-1 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-200 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteApt(apt.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-stone-200 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: RECUSAR AGENDAMENTO */}
      {/* ---------------------------------------------------- */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-stone-200 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Recusar Agendamento</span>
              </h3>
              <button
                onClick={() => setShowRejectModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-700">
              Você está prestes a recusar a solicitação de <strong>{showRejectModal.clientName}</strong> ({showRejectModal.serviceName} em {formatDateBR(showRejectModal.date)} às {showRejectModal.time}).
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Motivo da Recusa (será incluído na mensagem do WhatsApp):
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Horário indisponível devido a imprevisto na agenda."
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-800/20"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
              ⚡ Ao confirmar, uma mensagem será enviada automaticamente no WhatsApp da cliente comunicando que a solicitação não foi aprovada.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Confirmar Recusa & Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CRIAR OU EDITAR AGENDAMENTO */}
      {/* ---------------------------------------------------- */}
      {showNewAptModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-stone-200 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                {editingApt ? 'Editar Agendamento' : 'Novo Agendamento Administrativo'}
              </h3>
              <button
                onClick={() => setShowNewAptModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const clientNameInput = formData.get('clientName') as string;
                const clientWhatsappInput = formData.get('clientWhatsapp') as string;
                const serviceIdInput = formData.get('serviceId') as string;
                const dateInput = formData.get('date') as string;
                const timeInput = formData.get('time') as string;
                const statusInput = formData.get('status') as AppointmentStatus;
                const notesInput = formData.get('notes') as string;

                const svc = services.find(s => s.id === serviceIdInput) || services[0];

                if (editingApt) {
                  await updateAppointment({
                    ...editingApt,
                    clientName: clientNameInput,
                    clientWhatsapp: clientWhatsappInput,
                    serviceId: svc.id,
                    serviceName: svc.name,
                    servicePrice: svc.price,
                    serviceDuration: svc.durationMinutes,
                    date: dateInput,
                    time: timeInput,
                    status: statusInput,
                    notes: notesInput,
                  });
                  triggerToast('Agendamento atualizado.');
                } else {
                  const newApt = await createAppointment({
                    clientName: clientNameInput,
                    clientWhatsapp: clientWhatsappInput,
                    serviceId: svc.id,
                    serviceName: svc.name,
                    servicePrice: svc.price,
                    serviceDuration: svc.durationMinutes,
                    date: dateInput,
                    time: timeInput,
                    status: statusInput,
                    notes: notesInput,
                  });
                  // If created directly by admin as confirmed, trigger confirmation whatsapp
                  if (statusInput === 'confirmado') {
                    await sendWhatsAppBusinessMessage(newApt, 'agendamento_confirmado', { salonName: businessConfig.salonName });
                  }
                  triggerToast('Novo agendamento salvo.');
                }

                setShowNewAptModal(false);
                onRefreshData();
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Nome da Cliente *</label>
                  <input
                    type="text"
                    name="clientName"
                    required
                    defaultValue={editingApt?.clientName || ''}
                    placeholder="Nome completo"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-800 mb-1">WhatsApp *</label>
                  <input
                    type="text"
                    name="clientWhatsapp"
                    required
                    defaultValue={editingApt?.clientWhatsapp || ''}
                    placeholder="(11) 98765-4321"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Serviço *</label>
                <select
                  name="serviceId"
                  defaultValue={editingApt?.serviceId || services[0]?.id}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - R$ {s.price.toFixed(2).replace('.', ',')} ({s.durationMinutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Data *</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={editingApt?.date || getTodayDateString()}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Horário *</label>
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue={editingApt?.time || '10:00'}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Status *</label>
                  <select
                    name="status"
                    defaultValue={editingApt?.status || 'confirmado'}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl cursor-pointer"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Observações</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingApt?.notes || ''}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAptModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold cursor-pointer shadow-sm"
                >
                  Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CRIAR OU EDITAR SERVIÇO */}
      {/* ---------------------------------------------------- */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-stone-200 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button
                onClick={() => setShowServiceModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const category = formData.get('category') as string;
                const description = formData.get('description') as string;
                const durationMinutes = Number(formData.get('durationMinutes'));
                const price = Number(formData.get('price'));
                const active = formData.get('active') === 'on';

                const srv: Service = {
                  id: editingService?.id || 'srv-' + Date.now().toString(36),
                  name,
                  category,
                  description,
                  durationMinutes,
                  price,
                  image: editingService?.image || '/src/assets/images/service_cortes_1790710979603.jpg',
                  active,
                };

                await saveService(srv);
                triggerToast('Serviço salvo com sucesso.');
                setShowServiceModal(false);
                onRefreshData();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-stone-800 mb-1">Nome do Procedimento *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingService?.name || ''}
                  placeholder="Ex: Corte em Camadas & Hidratação"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Categoria *</label>
                <select
                  name="category"
                  defaultValue={editingService?.category || 'Corte & Estilo'}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                >
                  <option value="Corte & Estilo">Corte & Estilo</option>
                  <option value="Coloração & Mechas">Coloração & Mechas</option>
                  <option value="Tratamentos">Tratamentos</option>
                  <option value="Penteados">Penteados</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Duração (minutos) *</label>
                  <input
                    type="number"
                    name="durationMinutes"
                    required
                    min={15}
                    step={15}
                    defaultValue={editingService?.durationMinutes || 60}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    name="price"
                    required
                    min={0}
                    step={5}
                    defaultValue={editingService?.price || 120}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Descrição</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingService?.description || ''}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="active"
                  id="active"
                  defaultChecked={editingService ? editingService.active : true}
                  className="w-4 h-4 text-rose-900 rounded"
                />
                <label htmlFor="active" className="font-semibold text-stone-800 cursor-pointer">
                  Disponível para agendamento online das clientes
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold cursor-pointer shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: BLOQUEAR HORÁRIO OU DIA */}
      {/* ---------------------------------------------------- */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-stone-200 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                <span>Bloquear Horário ou Data</span>
              </h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBlock} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Data a Bloquear *</label>
                <input
                  type="date"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="wholeDay"
                    checked={blockWholeDay}
                    onChange={(e) => setBlockWholeDay(e.target.checked)}
                    className="w-4 h-4 text-rose-900 rounded cursor-pointer"
                  />
                  <label htmlFor="wholeDay" className="font-bold text-stone-800 cursor-pointer">
                    Bloquear o dia inteiro (Folga, Feriado, Curso)
                  </label>
                </div>

                {!blockWholeDay && (
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Horário Específico:</label>
                    <input
                      type="time"
                      value={blockTime}
                      onChange={(e) => setBlockTime(e.target.value)}
                      placeholder="Ex: 14:00"
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Motivo do Bloqueio *</label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Curso de aperfeiçoamento, Consulta médica, etc."
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <p className="text-[11px] text-stone-700">
                Os horários ou datas bloqueados ficarão indisponíveis para seleção no calendário público das clientes.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-950 hover:bg-rose-900 text-white rounded-xl font-semibold cursor-pointer shadow-sm"
                >
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
