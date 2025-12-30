// Simple in-memory cache with TTL
class Cache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    set(key, value, ttl = 300000) { // 5 minutes default
        // Clear existing timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Set value
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });

        // Set expiration timer
        const timer = setTimeout(() => {
            this.cache.delete(key);
            this.timers.delete(key);
        }, ttl);

        this.timers.set(key, timer);
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        return item.value;
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
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }

    // Get cache statistics
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Create global cache instances
export const searchCache = new Cache();
export const llmCache = new Cache();

// Cache key generators
export const generateSearchKey = (query, category) => {
    return `search:${query.toLowerCase().trim()}:${category}`;
};

export const generateLLMKey = (type, input) => {
    return `llm:${type}:${input.toLowerCase().trim()}`;
};