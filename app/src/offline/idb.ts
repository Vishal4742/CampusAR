// app/src/offline/idb.ts
// IndexedDB wrapper using `idb` library — §19.5.1
// All startup reads are batched in ONE transaction for minimum latency

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { IDB_NAME, IDB_VERSION } from '../../../shared/constants'
import type { CachedRoute, CampusMap } from '../../../shared/types'

// ─── Schema ──────────────────────────────────────────────────────────────────

interface CampusARDB extends DBSchema {
    mapData: {
        key: string       // campus map ID e.g. "oct_bhopal_main"
        value: CampusMap
    }
    routeCache: {
        key: string       // "FROM::TO"
        value: CachedRoute
    }
    settings: {
        key: string       // setting name
        value: unknown    // setting value
    }
}

// ─── Singleton connection ─────────────────────────────────────────────────────

let _db: IDBPDatabase<CampusARDB> | null = null

export async function getDB(): Promise<IDBPDatabase<CampusARDB>> {
    if (_db) return _db
    _db = await openDB<CampusARDB>(IDB_NAME, IDB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('mapData')) {
                db.createObjectStore('mapData')
            }
            if (!db.objectStoreNames.contains('routeCache')) {
                db.createObjectStore('routeCache')
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings')
            }
        },
    })
    return _db
}

// ─── Startup batch read (§19.5.1) ────────────────────────────────────────────
// All reads in a single transaction — avoids multiple round-trips to IDB

export interface StartupData {
    mapData: CampusMap | undefined
    routeCache: Map<string, CachedRoute>
}

export async function loadStartupData(mapId: string): Promise<StartupData> {
    const db = await getDB()
    const tx = db.transaction(['mapData', 'routeCache'], 'readonly')

    const [mapData, allRoutes] = await Promise.all([
        tx.objectStore('mapData').get(mapId),
        tx.objectStore('routeCache').getAll(),       // all cached routes
    ])

    await tx.done

    // Rebuild flat Map from stored array
    const routeCache = new Map<string, CachedRoute>()
    const routeKeys = await db.getAllKeys('routeCache')
    for (let i = 0; i < allRoutes.length; i++) {
        routeCache.set(routeKeys[i] as string, allRoutes[i])
    }

    return { mapData, routeCache }
}

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function saveMapData(map: CampusMap): Promise<void> {
    const db = await getDB()
    await db.put('mapData', map, map.id)
}

/**
 * Persist the entire precomputed route cache to IndexedDB.
 * Called once after precomputeAllRoutes() completes at install time.
 */
export async function saveRouteCache(cache: Map<string, CachedRoute>): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('routeCache', 'readwrite')
    const store = tx.objectStore('routeCache')

    const ops: Promise<unknown>[] = []
    for (const [key, value] of cache) {
        ops.push(store.put(value, key))
    }
    await Promise.all([...ops, tx.done])
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
    const db = await getDB()
    const val = await db.get('settings', key)
    return val !== undefined ? (val as T) : fallback
}

export async function setSetting(key: string, value: unknown): Promise<void> {
    const db = await getDB()
    await db.put('settings', value, key)
}
