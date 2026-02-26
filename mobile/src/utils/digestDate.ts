export function parseDigestDate(dateText: string): Date | null {
    const [year, month, day] = String(dateText).split('-').map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        const fallback = new Date(dateText);
        return Number.isNaN(fallback.getTime()) ? null : fallback;
    }

    // Use midday UTC to avoid timezone shifting to previous day on client devices.
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatDigestDate(dateText: string, options: Intl.DateTimeFormatOptions): string {
    const parsed = parseDigestDate(dateText);
    if (!parsed) return dateText;
    return parsed.toLocaleDateString('tr-TR', {
        ...options,
        timeZone: 'Europe/Istanbul',
    });
}
