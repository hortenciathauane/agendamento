export type AppointmentStatus = 'pendente' | 'confirmado' | 'cancelado' | 'concluido';

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  price: number;
  image: string;
  active: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientWhatsapp: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlockedSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm (if omitted, the entire day is blocked)
  reason: string;
  createdAt: string;
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  dayName: string;
  isOpen: boolean;
  openTime: string; // "09:00"
  closeTime: string; // "19:00"
  lunchBreakStart?: string; // "12:00"
  lunchBreakEnd?: string; // "13:00"
}

export interface BusinessConfig {
  salonName: string;
  hairdresserName: string;
  hairdresserPhone: string;
  address: string;
  slotIntervalMinutes: number; // e.g. 30
  schedules: DaySchedule[];
}

export type WhatsAppMessageType = 
  | 'solicitacao_pendente'
  | 'agendamento_confirmado'
  | 'agendamento_recusado'
  | 'agendamento_cancelado'
  | 'agendamento_concluido';

export interface WhatsAppLog {
  id: string;
  appointmentId: string;
  clientName: string;
  phone: string;
  messageType: WhatsAppMessageType;
  messageTitle: string;
  content: string;
  status: 'enviada' | 'entregue' | 'lida';
  timestamp: string;
  apiMessageId: string;
}
