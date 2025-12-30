// Simple in-memory cache with TTL
class Cache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    set(key, value, ttlSeconds = 300) { // 5 minutes default
        // Clear existing timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Set value
        this.cache.set(key, value);

        // Set expiration timer
        const timer = setTimeout(() => {
            this.cache.delete(key);
            this.timers.delete(key);
        }, ttlSeconds * 1000);

        this.timers.set(key, timer);
    }

    get(key) {
        return this.cache.get(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        return this.cache.delete(key);
    }

    clear() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.cache.clear();
        this.timers.clear();
    }

    size() {
        return this.cache.size;
    }
}

export const cache = new Cache();
