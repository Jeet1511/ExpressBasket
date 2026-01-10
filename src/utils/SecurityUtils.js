/**
 * Security Utilities to protect the application from prying eyes.
 * This file contains functions to disable browser developer tools and console logs in production.
 */

// Disable Right Click and Keyboard Shortcuts for DevTools
export const disableDevTools = () => {
    // Only run in production or if explicitly enabled
    if (import.meta.env.DEV) return;

    // Allow bypass for admins who set this flag
    try {
        if (typeof window !== 'undefined' && localStorage.getItem('debug_mode') === 'true') return;
    } catch (e) { }

    // Disable Right Click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // Disable Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Ctrl + Shift + I (Inspect)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }

        // Ctrl + Shift + J (Console)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            return false;
        }

        // Ctrl + Shift + C (Element Inspector)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return false;
        }

        // Ctrl + U (View Source)
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            return false;
        }
    });
};

// Disable Console Logs
export const disableConsole = () => {
    // Only run in production
    if (import.meta.env.DEV) return;

    // Allow bypass for admins who set this flag
    try {
        if (typeof window !== 'undefined' && localStorage.getItem('debug_mode') === 'true') return;
    } catch (e) { }

    // Create a dummy function
    const noOp = () => { };

    // Override console methods
    console.log = noOp;
    console.warn = noOp;
    console.error = noOp;
    console.info = noOp;
    console.debug = noOp;
    console.trace = noOp;
    console.table = noOp;
};
