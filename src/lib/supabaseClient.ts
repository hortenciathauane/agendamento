import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Appointment, BlockedSlot, BusinessConfig, Service, WhatsAppLog } from '../types';
import { 
  INITIAL_APPOINTMENTS, 
  INITIAL_BLOCKED_SLOTS, 
  INITIAL_BUSINESS_CONFIG, 
  INITIAL_SERVICES, 
  INITIAL_WHATSAPP_LOGS 
} from './seedData';

// Internal Supabase configuration from environment variables or storage
const getEnvVar = (name: string): string => {
  return (import.meta as any).env?.[name] || '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || (typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_URL') || '' : '');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || (typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '' : '');

export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
}

// Storage keys for persistent internal repository
const STORAGE_KEYS = {
  SERVICES: 'studio_services_v1',
  APPOINTMENTS: 'studio_appointments_v1',
  BLOCKED: 'studio_blocked_slots_v1',
  CONFIG: 'studio_business_config_v1',
  WHATSAPP_LOGS: 'studio_whatsapp_logs_v1',
};

// Helpers for localStorage fallback persistence
function loadLocal<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(item) as T;
  } catch (e) {
    return defaultVal;
  }
}

function saveLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// Event dispatcher to notify components of live updates across tabs or views
const eventTarget = new EventTarget();
export const DB_CHANGE_EVENT = 'studio_db_change';

export function notifyDbChange(entity: string) {
  eventTarget.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { detail: { entity } }));
}

export function subscribeToDbChanges(callback: (entity: string) => void) {
  const handler = (e: Event) => {
    const custom = e as CustomEvent;
    callback(custom.detail?.entity || 'all');
  };
  eventTarget.addEventListener(DB_CHANGE_EVENT, handler);
  return () => eventTarget.removeEventListener(DB_CHANGE_EVENT, handler);
}

// ----------------------------------------------------
// SERVICES REPOSITORY
// ----------------------------------------------------
export async function getServices(): Promise<Service[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('services').select('*').order('price', { ascending: true });
      if (!error && data && data.length > 0) return data as Service[];
      // If table is newly created and empty, seed it with default salon services
      if (!error && data && data.length === 0) {
        await supabase.from('services').insert(INITIAL_SERVICES);
        return INITIAL_SERVICES;
      }
    } catch {
      // Fallback to internal storage
    }
  }
  return loadLocal<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
}

export async function saveService(service: Service): Promise<Service> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('services').upsert(service).select().single();
      if (!error && data) {
        notifyDbChange('services');
        return data as Service;
      }
    } catch {
      // Fallback
    }
  }
  const services = loadLocal<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const index = services.findIndex(s => s.id === service.id);
  let updated: Service[];
  if (index >= 0) {
    updated = [...services];
    updated[index] = service;
  } else {
    updated = [service, ...services];
  }
  saveLocal(STORAGE_KEYS.SERVICES, updated);
  notifyDbChange('services');
  return service;
}

export async function deleteService(id: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('services').delete().eq('id', id);
    } catch {}
  }
  const services = loadLocal<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const filtered = services.filter(s => s.id !== id);
  saveLocal(STORAGE_KEYS.SERVICES, filtered);
  notifyDbChange('services');
  return true;
}

// ----------------------------------------------------
// APPOINTMENTS REPOSITORY
// ----------------------------------------------------
export async function getAppointments(): Promise<Appointment[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('appointments').select('*').order('date', { ascending: false });
      if (!error && data) {
        // Normalize column casing from Postgres if needed
        const normalized: Appointment[] = data.map((item: any) => ({
          id: item.id,
          clientName: item.clientName ?? item.clientname ?? item.client_name ?? '',
          clientWhatsapp: item.clientWhatsapp ?? item.clientwhatsapp ?? item.client_whatsapp ?? '',
          serviceId: item.serviceId ?? item.serviceid ?? item.service_id ?? '',
          serviceName: item.serviceName ?? item.servicename ?? item.service_name ?? '',
          servicePrice: Number(item.servicePrice ?? item.serviceprice ?? item.service_price ?? 0),
          serviceDuration: Number(item.serviceDuration ?? item.serviceduration ?? item.service_duration ?? 60),
          date: item.date,
          time: item.time,
          status: (item.status ?? 'pendente') as Appointment['status'],
          notes: item.notes ?? '',
          rejectionReason: item.rejectionReason ?? item.rejectionreason ?? item.rejection_reason ?? '',
          createdAt: item.createdAt ?? item.createdat ?? item.created_at ?? new Date().toISOString(),
          updatedAt: item.updatedAt ?? item.updatedat ?? item.updated_at ?? new Date().toISOString(),
        }));
        saveLocal(STORAGE_KEYS.APPOINTMENTS, normalized);
        return normalized;
      }
    } catch (e) {
      console.error('Error fetching appointments from Supabase:', e);
    }
  }
  return loadLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
}

export async function createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
  const newApt: Appointment = {
    ...appointment,
    id: 'apt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('appointments').insert(newApt).select().single();
      if (!error && data) {
        const list = loadLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
        saveLocal(STORAGE_KEYS.APPOINTMENTS, [data as Appointment, ...list.filter(a => a.id !== newApt.id)]);
        notifyDbChange('appointments');
        return data as Appointment;
      }
    } catch (e) {
      console.error('Supabase insert failed, storing locally:', e);
    }
  }

  const list = loadLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const updated = [newApt, ...list];
  saveLocal(STORAGE_KEYS.APPOINTMENTS, updated);
  notifyDbChange('appointments');
  return newApt;
}

export async function updateAppointment(appointment: Appointment): Promise<Appointment> {
  const toSave = { ...appointment, updatedAt: new Date().toISOString() };
  if (supabase) {
    try {
      const { data, error } = await supabase.from('appointments').upsert(toSave).select().single();
      if (!error && data) {
        const list = loadLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
        const idx = list.findIndex(a => a.id === appointment.id);
        if (idx >= 0) list[idx] = data as Appointment;
        else list.unshift(data as Appointment);
        saveLocal(STORAGE_KEYS.APPOINTMENTS, list);
        notifyDbChange('appointments');
        return data as Appointment;
      }
    } catch (e) {
      console.error('Supabase upsert failed:', e);
    }
  }

  const list = loadLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const index = list.findIndex(a => a.id === appointment.id);
  if (index >= 0) {
    list[index] = toSave;
  } else {
    list.unshift(toSave);
  }
  saveLocal(STORAGE_KEYS.APPOINTMENTS, list);
  notifyDbChange('appointments');
  return toSave;
}

export async function updateAppointmentStatus(
  id: string, 
  status: Appointment['status'], 
  rejectionReason?: string
): Promise<Appointment | null> {
  const updatedAt = new Date().toISOString();
  let updatedApt: Appointment | null = null;

  // 1. Update Supabase if connected
  if (supabase) {
    try {
      const payload: Record<string, any> = {
        status,
        updatedAt,
      };
      if (rejectionReason !== undefined) {
        payload.rejectionReason = rejectionReason;
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id)
        .select();

      if (!error && data && data.length > 0) {
        updatedApt = data[0] as Appointment;
      } else if (error) {
        console.warn('Supabase update attempt 1 error, trying simple status update:', error);
        // Fallback with minimal payload in case column casing differs in Postgres
        await supabase
          .from('appointments')
          .update({ status })
          .eq('id', id);
      }
    } catch (err) {
      console.error('Error updating appointment in Supabase:', err);
    }
  }

  // 2. Update local persistent cache
  const list = loadLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const index = list.findIndex(a => a.id === id);
  if (index >= 0) {
    list[index].status = status;
    if (rejectionReason !== undefined) {
      list[index].rejectionReason = rejectionReason;
    }
    list[index].updatedAt = updatedAt;
    updatedApt = list[index];
  } else if (updatedApt) {
    list.unshift(updatedApt);
  }

  saveLocal(STORAGE_KEYS.APPOINTMENTS, list);
  notifyDbChange('appointments');
  return updatedApt;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('appointments').delete().eq('id', id);
    } catch {}
  }
  const list = loadLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const filtered = list.filter(a => a.id !== id);
  saveLocal(STORAGE_KEYS.APPOINTMENTS, filtered);
  notifyDbChange('appointments');
  return true;
}

// ----------------------------------------------------
// BLOCKED SLOTS REPOSITORY
// ----------------------------------------------------
export async function getBlockedSlots(): Promise<BlockedSlot[]> {
  if (supabase) {
    try {
      const { data } = await supabase.from('blocked_slots').select('*');
      if (data) return data as BlockedSlot[];
    } catch {}
  }
  return loadLocal<BlockedSlot[]>(STORAGE_KEYS.BLOCKED, INITIAL_BLOCKED_SLOTS);
}

export async function addBlockedSlot(slot: Omit<BlockedSlot, 'id' | 'createdAt'>): Promise<BlockedSlot> {
  const newSlot: BlockedSlot = {
    ...slot,
    id: 'blk-' + Date.now().toString(36),
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from('blocked_slots').insert(newSlot);
    } catch {}
  }

  const list = loadLocal<BlockedSlot[]>(STORAGE_KEYS.BLOCKED, INITIAL_BLOCKED_SLOTS);
  list.push(newSlot);
  saveLocal(STORAGE_KEYS.BLOCKED, list);
  notifyDbChange('blocked');
  return newSlot;
}

export async function removeBlockedSlot(id: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('blocked_slots').delete().eq('id', id);
    } catch {}
  }
  const list = loadLocal<BlockedSlot[]>(STORAGE_KEYS.BLOCKED, INITIAL_BLOCKED_SLOTS);
  const filtered = list.filter(b => b.id !== id);
  saveLocal(STORAGE_KEYS.BLOCKED, filtered);
  notifyDbChange('blocked');
  return true;
}

// ----------------------------------------------------
// BUSINESS CONFIG REPOSITORY
// ----------------------------------------------------
export async function getBusinessConfig(): Promise<BusinessConfig> {
  if (supabase) {
    try {
      const { data } = await supabase.from('business_config').select('*').single();
      if (data) return data as BusinessConfig;
    } catch {}
  }
  return loadLocal<BusinessConfig>(STORAGE_KEYS.CONFIG, INITIAL_BUSINESS_CONFIG);
}

export async function saveBusinessConfig(config: BusinessConfig): Promise<BusinessConfig> {
  if (supabase) {
    try {
      await supabase.from('business_config').upsert({ id: 'config_1', ...config });
    } catch {}
  }
  saveLocal(STORAGE_KEYS.CONFIG, config);
  notifyDbChange('config');
  return config;
}

// ----------------------------------------------------
// WHATSAPP NOTIFICATION LOGS
// ----------------------------------------------------
export async function getWhatsAppLogs(): Promise<WhatsAppLog[]> {
  if (supabase) {
    try {
      const { data } = await supabase.from('whatsapp_logs').select('*').order('timestamp', { ascending: false });
      if (data) return data as WhatsAppLog[];
    } catch {}
  }
  return loadLocal<WhatsAppLog[]>(STORAGE_KEYS.WHATSAPP_LOGS, INITIAL_WHATSAPP_LOGS);
}

export async function addWhatsAppLog(log: Omit<WhatsAppLog, 'id' | 'timestamp' | 'apiMessageId'>): Promise<WhatsAppLog> {
  const newLog: WhatsAppLog = {
    ...log,
    id: 'wlog-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    timestamp: new Date().toISOString(),
    apiMessageId: 'wamid.HBgL' + Math.random().toString(36).substring(2, 10).toUpperCase() + '==',
  };

  if (supabase) {
    try {
      await supabase.from('whatsapp_logs').insert(newLog);
    } catch {}
  }

  const logs = loadLocal<WhatsAppLog[]>(STORAGE_KEYS.WHATSAPP_LOGS, INITIAL_WHATSAPP_LOGS);
  const updated = [newLog, ...logs];
  saveLocal(STORAGE_KEYS.WHATSAPP_LOGS, updated);
  notifyDbChange('whatsapp_logs');
  return newLog;
}
