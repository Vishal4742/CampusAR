// Type shims for packages without bundled declarations
declare module '@nimiq/qr-scanner'
declare module 'vite-plugin-pwa' {
    import type { Plugin } from 'vite'
    export function VitePWA(options?: Record<string, unknown>): Plugin[]
}
