import { Service, BusinessConfig, Appointment, BlockedSlot, WhatsAppLog } from '../types';

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'Corte Feminino & Visagismo',
    category: 'Corte & Estilo',
    description: 'Análise visagista de traços faciais, lavagem terapêutica, corte personalizado e finalização escovada.',
    durationMinutes: 60,
    price: 130.00,
    image: '/src/assets/images/service_cortes_1790710979603.jpg',
    active: true,
  },
  {
    id: 'srv-2',
    name: 'Mechas, Balayage & Iluminação',
    category: 'Coloração & Mechas',
    description: 'Técnica de morena iluminada ou loiro dos sonhos com produtos de proteção Plex, tonalização e nutrição pós-cor.',
    durationMinutes: 180,
    price: 390.00,
    image: '/src/assets/images/service_coloracao_1790710988487.jpg',
    active: true,
  },
  {
    id: 'srv-3',
    name: 'Coloração Raiz & Banho de Brilho',
    category: 'Coloração & Mechas',
    description: 'Cobertura impecável de fios brancos com tintura premium sem amônia e revitalização do comprimento.',
    durationMinutes: 90,
    price: 190.00,
    image: '/src/assets/images/service_coloracao_1790710988487.jpg',
    active: true,
  },
  {
    id: 'srv-4',
    name: 'Escova Modelada & Ozonioterapia',
    category: 'Tratamentos',
    description: 'Vapor de ozônio purificante no couro cabeludo, máscara de hidratação profunda e escova glamourosa com ondas.',
    durationMinutes: 50,
    price: 95.00,
    image: '/src/assets/images/service_cortes_1790710979603.jpg',
    active: true,
  },
  {
    id: 'srv-5',
    name: 'Botox Capilar & Alinhamento Térmico',
    category: 'Tratamentos',
    description: 'Redução de volume e frizz, selagem de cutículas e reposição de massa capilar com brilho espelhado.',
    durationMinutes: 120,
    price: 240.00,
    image: '/src/assets/images/service_cortes_1790710979603.jpg',
    active: true,
  },
  {
    id: 'srv-6',
    name: 'Penteado Social & Produção para Festas',
    category: 'Penteados',
    description: 'Penteados clássicos ou despojados (coques, semi-presos, tranças) com alta fixação para casamentos e formaturas.',
    durationMinutes: 75,
    price: 180.00,
    image: '/src/assets/images/service_cortes_1790710979603.jpg',
    active: true,
  }
];

export const INITIAL_BUSINESS_CONFIG: BusinessConfig = {
  salonName: 'Studio Bella Concept',
  hairdresserName: 'Isabella Mendes',
  hairdresserPhone: '5511987654321',
  address: 'Av. das Flores, 850 - Sala 302, Jardins',
  slotIntervalMinutes: 30,
  schedules: [
    { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: false, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '19:00', lunchBreakStart: '12:00', lunchBreakEnd: '13:00' },
    { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '19:00', lunchBreakStart: '12:00', lunchBreakEnd: '13:00' },
    { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '19:00', lunchBreakStart: '12:00', lunchBreakEnd: '13:00' },
    { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '19:30', lunchBreakStart: '12:30', lunchBreakEnd: '13:30' },
    { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:30', closeTime: '18:00', lunchBreakStart: '13:00', lunchBreakEnd: '13:30' },
  ]
};

// Helper to get formatted dates relative to today
export function getRelativeDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-001',
    clientName: 'Camila Ferreira Rocha',
    clientWhatsapp: '(11) 99123-4567',
    serviceId: 'srv-1',
    serviceName: 'Corte Feminino & Visagismo',
    servicePrice: 130.00,
    serviceDuration: 60,
    date: getRelativeDateString(0), // Today
    time: '14:00',
    status: 'confirmado',
    notes: 'Prefere corte em camadas médias com franja cortina.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'apt-002',
    clientName: 'Juliana Paes Silveira',
    clientWhatsapp: '(11) 98777-1234',
    serviceId: 'srv-2',
    serviceName: 'Mechas, Balayage & Iluminação',
    servicePrice: 390.00,
    serviceDuration: 180,
    date: getRelativeDateString(1), // Tomorrow
    time: '09:30',
    status: 'pendente',
    notes: 'Primeira vez no salão. Tem cabelo castanho escuro e deseja morena iluminada tom avelã.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'apt-003',
    clientName: 'Mariana Duarte Costa',
    clientWhatsapp: '(11) 97455-8910',
    serviceId: 'srv-4',
    serviceName: 'Escova Modelada & Ozonioterapia',
    servicePrice: 95.00,
    serviceDuration: 50,
    date: getRelativeDateString(1),
    time: '15:00',
    status: 'pendente',
    notes: 'Evento às 19h no mesmo dia.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'apt-004',
    clientName: 'Beatriz Albuquerque',
    clientWhatsapp: '(11) 99881-2233',
    serviceId: 'srv-5',
    serviceName: 'Botox Capilar & Alinhamento Térmico',
    servicePrice: 240.00,
    serviceDuration: 120,
    date: getRelativeDateString(2),
    time: '10:00',
    status: 'confirmado',
    notes: '',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'apt-005',
    clientName: 'Fernanda Lima Gusmão',
    clientWhatsapp: '(11) 98112-9900',
    serviceId: 'srv-3',
    serviceName: 'Coloração Raiz & Banho de Brilho',
    servicePrice: 190.00,
    serviceDuration: 90,
    date: getRelativeDateString(-2), // 2 days ago
    time: '14:30',
    status: 'concluido',
    notes: 'Retoque de raiz 100% branca na cor 5.0.',
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'apt-006',
    clientName: 'Luciana Martins',
    clientWhatsapp: '(11) 97665-4321',
    serviceId: 'srv-6',
    serviceName: 'Penteado Social & Produção para Festas',
    servicePrice: 180.00,
    serviceDuration: 75,
    date: getRelativeDateString(-1),
    time: '17:00',
    status: 'cancelado',
    rejectionReason: 'Horário já reservado para noiva externa.',
    notes: '',
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
  }
];

export const INITIAL_BLOCKED_SLOTS: BlockedSlot[] = [
  {
    id: 'blk-001',
    date: getRelativeDateString(0),
    time: '12:00',
    reason: 'Intervalo de Almoço',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'blk-002',
    date: getRelativeDateString(3),
    time: undefined, // Entire day blocked
    reason: 'Workshop & Aperfeiçoamento L\'Oréal Paris',
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_WHATSAPP_LOGS: WhatsAppLog[] = [
  {
    id: 'wlog-001',
    appointmentId: 'apt-002',
    clientName: 'Juliana Paes Silveira',
    phone: '(11) 98777-1234',
    messageType: 'solicitacao_pendente',
    messageTitle: 'Solicitação em Análise',
    content: 'Olá Juliana Paes Silveira! Recebemos o seu pedido de agendamento para Mechas, Balayage & Iluminação no dia ' + getRelativeDateString(1) + ' às 09:30. No momento seu horário está AGUARDANDO APROVAÇÃO da cabeleireira. Avisaremos assim que for confirmado! Studio Bella Concept.',
    status: 'entregue',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    apiMessageId: 'wamid.HBgLMTE5ODc3NzEyMzQVFQIAEhggNTZFMzk=',
  },
  {
    id: 'wlog-002',
    appointmentId: 'apt-001',
    clientName: 'Camila Ferreira Rocha',
    phone: '(11) 99123-4567',
    messageType: 'agendamento_confirmado',
    messageTitle: 'Agendamento Confirmado',
    content: '✅ Agendamento Confirmado! Olá Camila Ferreira Rocha, seu horário está confirmado com sucesso!\n\n💇 Serviço: Corte Feminino & Visagismo\n📅 Data: ' + getRelativeDateString(0) + '\n⏰ Horário: 14:00\n📍 Local: Studio Bella Concept - Av. das Flores, 850\n\nEstamos ansiosas para recebê-la!',
    status: 'lida',
    timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
    apiMessageId: 'wamid.HBgLMTE5OTEyMzQ1NjcVFQIAEhggOERBNjM=',
  }
];
