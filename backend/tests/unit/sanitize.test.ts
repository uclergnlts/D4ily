import { describe, it, expect } from 'vitest';
import { sanitizeUrl, escapeRegExp, sanitizeHtml, stripHtml, sanitizeInput } from '@/utils/sanitize.js';

describe('sanitizeUrl', () => {
    it('should return empty string for null/undefined', () => {
        expect(sanitizeUrl(null)).toBe('');
        expect(sanitizeUrl(undefined)).toBe('');
        expect(sanitizeUrl('')).toBe('');
    });

    it('should block javascript: protocol', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBe('');
        expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
        expect(sanitizeUrl('  javascript:alert(1)')).toBe('');
    });

    it('should block data: protocol', () => {
        expect(sanitizeUrl('data:text/html,<h1>XSS</h1>')).toBe('');
        expect(sanitizeUrl('DATA:image/png;base64,abc')).toBe('');
    });

    it('should block vbscript: and file: protocols', () => {
        expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
        expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('should allow safe https URLs', () => {
        expect(sanitizeUrl('https://example.com/news')).toBe('https://example.com/news');
    });

    it('should allow safe http URLs', () => {
        expect(sanitizeUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
    });

    it('should trim whitespace from safe URLs', () => {
        expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
});

describe('escapeRegExp', () => {
    it('should escape special regex characters', () => {
        expect(escapeRegExp('.')).toBe('\\.');
        expect(escapeRegExp('*')).toBe('\\*');
        expect(escapeRegExp('+')).toBe('\\+');
        expect(escapeRegExp('?')).toBe('\\?');
        expect(escapeRegExp('^')).toBe('\\^');
        expect(escapeRegExp('$')).toBe('\\$');
        expect(escapeRegExp('{')).toBe('\\{');
        expect(escapeRegExp('}')).toBe('\\}');
        expect(escapeRegExp('(')).toBe('\\(');
        expect(escapeRegExp(')')).toBe('\\)');
        expect(escapeRegExp('|')).toBe('\\|');
        expect(escapeRegExp('[')).toBe('\\[');
        expect(escapeRegExp(']')).toBe('\\]');
        expect(escapeRegExp('\\')).toBe('\\\\');
    });

    it('should not modify safe characters', () => {
        expect(escapeRegExp('hello world')).toBe('hello world');
        expect(escapeRegExp('abc123')).toBe('abc123');
    });

    it('should escape multiple special chars in a string', () => {
        const escaped = escapeRegExp('1+1=2 (math)');
        expect(escaped).toBe('1\\+1=2 \\(math\\)');
        // Should work as a valid regex
        expect(new RegExp(escaped).test('1+1=2 (math)')).toBe(true);
    });
});

describe('sanitizeHtml', () => {
    it('should return empty string for null/undefined', () => {
        expect(sanitizeHtml(null)).toBe('');
        expect(sanitizeHtml(undefined)).toBe('');
    });

    it('should remove script tags', () => {
        const result = sanitizeHtml('<p>Hello</p><script>alert(1)</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('Hello');
    });

    it('should keep allowed tags', () => {
        const result = sanitizeHtml('<p>Hello <strong>world</strong></p>');
        expect(result).toContain('<p>');
        expect(result).toContain('<strong>');
    });

    it('should remove onclick handlers', () => {
        const result = sanitizeHtml('<p onclick="alert(1)">Click me</p>');
        expect(result).not.toContain('onclick');
    });
});

describe('stripHtml', () => {
    it('should return empty string for null/undefined', () => {
        expect(stripHtml(null)).toBe('');
        expect(stripHtml(undefined)).toBe('');
    });

    it('should remove all HTML tags', () => {
        const result = stripHtml('<p>Hello <strong>world</strong></p>');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).toContain('Hello');
        expect(result).toContain('world');
    });
});

describe('sanitizeInput', () => {
    it('should return empty string for null/undefined', () => {
        expect(sanitizeInput(null)).toBe('');
        expect(sanitizeInput(undefined)).toBe('');
    });

    it('should strip HTML from input', () => {
        const result = sanitizeInput('<script>alert(1)</script>Hello');
        expect(result).not.toContain('<script>');
        expect(result).toContain('Hello');
    });

    it('should trim whitespace', () => {
        const result = sanitizeInput('  Hello World  ');
        expect(result).toBe('Hello World');
    });

    it('should truncate input exceeding 10000 characters', () => {
        const longInput = 'a'.repeat(15000);
        const result = sanitizeInput(longInput);
        expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should not truncate short input', () => {
        const short = 'Hello World';
        expect(sanitizeInput(short)).toBe('Hello World');
    });
});
