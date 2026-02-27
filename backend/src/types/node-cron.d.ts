declare module 'node-cron' {
    export function schedule(
        expression: string,
        func: () => void,
        options?: {
            scheduled?: boolean;
            timezone?: string;
        }
    ): {
        start: () => void;
        stop: () => void;
        destroy: () => void;
    };

    export function validate(expression: string): boolean;
}
