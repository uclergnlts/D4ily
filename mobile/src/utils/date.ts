export function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'şimdi';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}d`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}s`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}g`;

    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
