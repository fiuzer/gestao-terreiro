const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | null | undefined): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return moneyFormatter.format(safe);
}

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const MONTHS_SHORT_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

export function monthName(month: number): string {
  return MONTHS_PT[clampMonth(month) - 1];
}

export function monthShortName(month: number): string {
  return MONTHS_SHORT_PT[clampMonth(month) - 1];
}

export function formatMonthYear(month: number, year: number): string {
  return `${monthName(month)} de ${year}`;
}

export function addMonths(month: number, year: number, delta: number): { month: number; year: number } {
  const total = (year * 12 + (clampMonth(month) - 1)) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return { month: newMonth, year: newYear };
}

export function parseMoneyInput(input: string): number {
  if (!input) return 0;
  const cleaned = input
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : NaN;
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

function clampMonth(month: number): number {
  if (month < 1) return 1;
  if (month > 12) return 12;
  return Math.floor(month);
}
