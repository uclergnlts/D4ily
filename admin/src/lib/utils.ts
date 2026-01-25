import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getSentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-600 bg-green-100';
    case 'negative':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getPoliticalToneLabel(score: number): string {
  if (score <= -4) return 'Far Left';
  if (score <= -2) return 'Left';
  if (score < 0) return 'Center-Left';
  if (score === 0) return 'Neutral';
  if (score < 2) return 'Center-Right';
  if (score < 4) return 'Right';
  return 'Far Right';
}

export function getPoliticalToneColor(score: number): string {
  if (score <= -2) return 'text-blue-600 bg-blue-100';
  if (score >= 2) return 'text-red-600 bg-red-100';
  return 'text-gray-600 bg-gray-100';
}
