import { Appointment, BlockedSlot, DaySchedule } from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDatePortuguese(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

export function getDayOfWeekFromDateString(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

// Convert "09:30" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Convert minutes from midnight to "09:30"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculates available time slots for a given date and service duration.
 * Strictly prevents already booked or overlapping slots and blocked periods!
 */
export function calculateAvailableSlots(
  dateStr: string,
  serviceDurationMinutes: number,
  schedule: DaySchedule,
  appointments: Appointment[],
  blockedSlots: BlockedSlot[],
  intervalMinutes: number = 30
): { time: string; available: boolean; reason?: string }[] {
  if (!schedule.isOpen) {
    return [];
  }

  // Check if entire day is blocked
  const isWholeDayBlocked = blockedSlots.some(
    b => b.date === dateStr && (!b.time || b.time.trim() === '')
  );
  if (isWholeDayBlocked) {
    return [];
  }

  const openMinutes = timeToMinutes(schedule.openTime);
  const closeMinutes = timeToMinutes(schedule.closeTime);
  const lunchStart = schedule.lunchBreakStart ? timeToMinutes(schedule.lunchBreakStart) : null;
  const lunchEnd = schedule.lunchBreakEnd ? timeToMinutes(schedule.lunchBreakEnd) : null;

  // Active appointments on this date that take up time
  const dayAppointments = appointments.filter(
    a => a.date === dateStr && (a.status === 'confirmado' || a.status === 'pendente')
  );

  // Time-specific blocks on this date
  const dayTimeBlocks = blockedSlots.filter(
    b => b.date === dateStr && b.time
  );

  const slots: { time: string; available: boolean; reason?: string }[] = [];

  // Generate slots from open to close (ensuring service fits before closing time)
  for (let m = openMinutes; m + serviceDurationMinutes <= closeMinutes; m += intervalMinutes) {
    const slotTimeStr = minutesToTime(m);
    const slotEndMinutes = m + serviceDurationMinutes;

    let isAvailable = true;
    let unavailableReason = '';

    // 1. Check Lunch break overlap
    if (lunchStart !== null && lunchEnd !== null) {
      if (m < lunchEnd && slotEndMinutes > lunchStart) {
        isAvailable = false;
        unavailableReason = 'Horário de almoço';
      }
    }

    // 2. Check Overlap with existing booked appointments
    if (isAvailable) {
      for (const apt of dayAppointments) {
        const aptStart = timeToMinutes(apt.time);
        const aptEnd = aptStart + (apt.serviceDuration || 60);

        // Check if [m, slotEndMinutes) overlaps with [aptStart, aptEnd)
        if (m < aptEnd && slotEndMinutes > aptStart) {
          isAvailable = false;
          unavailableReason = apt.status === 'pendente' 
            ? 'Em análise de aprovação' 
            : 'Horário já reservado';
          break;
        }
      }
    }

    // 3. Check Overlap with blocked slots
    if (isAvailable) {
      for (const block of dayTimeBlocks) {
        if (!block.time) continue;
        const blockStart = timeToMinutes(block.time);
        const blockEnd = blockStart + 30; // standard 30 min block or slot

        if (m < blockEnd && slotEndMinutes > blockStart) {
          isAvailable = false;
          unavailableReason = `Bloqueado: ${block.reason}`;
          break;
        }
      }
    }

    // 4. Past time check if today
    const todayStr = getTodayDateString();
    if (dateStr === todayStr) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (m <= currentMinutes) {
        isAvailable = false;
        unavailableReason = 'Horário já ultrapassado';
      }
    }

    slots.push({
      time: slotTimeStr,
      available: isAvailable,
      reason: unavailableReason,
    });
  }

  return slots;
}
