/**
 * Business Hours Utility for Shoreline Dental Chicago
 *
 * Handles business hours logic, including checking if currently open
 * and determining next opening time for after-hours responses.
 */

export interface BusinessHours {
  day: number; // 0 = Sunday, 6 = Saturday
  open: string; // HH:MM format
  close: string; // HH:MM format
}

// Shoreline Dental Chicago Business Hours
const BUSINESS_HOURS: BusinessHours[] = [
  // Sunday (closed)
  { day: 0, open: '', close: '' },
  // Monday: 11:00 AM - 7:00 PM
  { day: 1, open: '11:00', close: '19:00' },
  // Tuesday: 7:00 AM - 7:00 PM
  { day: 2, open: '07:00', close: '19:00' },
  // Wednesday: 7:00 AM - 7:00 PM
  { day: 3, open: '07:00', close: '19:00' },
  // Thursday: 7:00 AM - 3:00 PM
  { day: 4, open: '07:00', close: '15:00' },
  // Friday: 7:00 AM - 3:00 PM
  { day: 5, open: '07:00', close: '15:00' },
  // Saturday: 8:00 AM - 1:00 PM (every other Saturday)
  { day: 6, open: '08:00', close: '13:00' },
];

const TIMEZONE = 'America/Chicago';

/**
 * Get current time in Chicago timezone
 */
function getCurrentChicagoTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if the practice is currently open
 */
export function isBusinessHoursNow(): boolean {
  const now = getCurrentChicagoTime();
  const dayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayHours = BUSINESS_HOURS.find(h => h.day === dayOfWeek);

  if (!todayHours || !todayHours.open) {
    // Closed today
    return false;
  }

  const openMinutes = parseTimeToMinutes(todayHours.open);
  const closeMinutes = parseTimeToMinutes(todayHours.close);

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Get formatted next opening time
 * Returns string like "Monday at 11:00 AM" or "tomorrow at 7:00 AM"
 */
export function getNextOpeningTime(): string {
  const now = getCurrentChicagoTime();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check rest of today first
  const todayHours = BUSINESS_HOURS.find(h => h.day === currentDay);
  if (todayHours && todayHours.open) {
    const openMinutes = parseTimeToMinutes(todayHours.open);
    if (currentMinutes < openMinutes) {
      return `today at ${formatTime(todayHours.open)}`;
    }
  }

  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const nextDayHours = BUSINESS_HOURS.find(h => h.day === nextDay);

    if (nextDayHours && nextDayHours.open) {
      const dayName = getDayName(nextDay);
      const time = formatTime(nextDayHours.open);

      if (i === 1) {
        return `tomorrow at ${time}`;
      } else {
        return `${dayName} at ${time}`;
      }
    }
  }

  return 'Monday at 11:00 AM'; // Fallback
}

/**
 * Get day name from day number
 */
function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
}

/**
 * Format 24-hour time (HH:MM) to 12-hour format with AM/PM
 */
function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get business hours status message for chat responses
 */
export function getBusinessHoursMessage(): string {
  if (isBusinessHoursNow()) {
    return 'Our office is currently open! You can call us now at 312-266-9487.';
  } else {
    const nextOpen = getNextOpeningTime();
    return `Our office is currently closed. We will reopen ${nextOpen}. You can schedule an appointment 24/7 at https://app.neem.software/shorelinedentalchicago/self-scheduling`;
  }
}

/**
 * Get current day's business hours in readable format
 */
export function getTodayHours(): string {
  const now = getCurrentChicagoTime();
  const dayOfWeek = now.getDay();
  const todayHours = BUSINESS_HOURS.find(h => h.day === dayOfWeek);

  if (!todayHours || !todayHours.open) {
    return 'Closed today';
  }

  return `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
}

/**
 * Check if it's Saturday (special hours)
 */
export function isSaturday(): boolean {
  const now = getCurrentChicagoTime();
  return now.getDay() === 6;
}

export default {
  isBusinessHoursNow,
  getNextOpeningTime,
  getBusinessHoursMessage,
  getTodayHours,
  isSaturday,
};
