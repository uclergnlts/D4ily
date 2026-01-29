import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Lazy initialization to avoid issues during module load
let purify: ReturnType<typeof DOMPurify> | null = null;

function getPurify() {
    if (!purify) {
        const window = new JSDOM('').window;
        purify = DOMPurify(window);
    }
    return purify;
}

// Configure DOMPurify for RSS content
const purifyConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    KEEP_CONTENT: true,
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - Raw HTML content
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
    if (!dirty) return '';
    return getPurify().sanitize(dirty, purifyConfig);
}

/**
 * Strip all HTML tags, return plain text only
 * @param html - HTML content
 * @returns Plain text
 */
export function stripHtml(html: string | undefined | null): string {
    if (!html) return '';
    return getPurify().sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize URL to prevent javascript: protocol attacks
 * @param url - URL to sanitize
 * @returns Safe URL or empty string
 */
export function sanitizeUrl(url: string | undefined | null): string {
    if (!url) return '';
    
    const sanitized = url.trim().toLowerCase();
    
    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const protocol of dangerousProtocols) {
        if (sanitized.startsWith(protocol)) {
            return '';
        }
    }
    
    return url.trim();
}

/**
 * Escape special regex characters
 * @param string - String to escape
 * @returns Escaped string
 */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize user input for safe display
 * @param input - User input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string | undefined | null): string {
    if (!input) return '';
    
    // First strip all HTML
    let sanitized = stripHtml(input);
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length to prevent DoS
    const MAX_LENGTH = 10000;
    if (sanitized.length > MAX_LENGTH) {
        sanitized = sanitized.substring(0, MAX_LENGTH);
    }
    
    return sanitized;
}
