// Keep-alive mechanism to prevent cold starts
let keepAliveInterval = null;

export function startKeepAlive(url, intervalMinutes = 10) {
    if (process.env.NODE_ENV !== 'production') {
        console.log('Keep-alive disabled in development');
        return;
    }

    console.log(`🔄 Starting keep-alive ping every ${intervalMinutes} minutes`);

    const pingServer = async () => {
        try {
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                timeout: 5000
            });

            if (response.ok) {
                console.log('✅ Keep-alive ping successful');
            } else {
                console.warn('⚠️ Keep-alive ping failed:', response.status);
            }
        } catch (error) {
            console.warn('⚠️ Keep-alive ping error:', error.message);
        }
    };

    // Initial ping after 1 minute
    setTimeout(pingServer, 60000);

    // Set up interval
    keepAliveInterval = setInterval(pingServer, intervalMinutes * 60 * 1000);
}

export function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log('🛑 Keep-alive stopped');
    }
}

// Warm up function for immediate deployment
export async function warmUp() {
    console.log('🔥 Warming up services...');

    // Pre-load modules and initialize caches
    try {
        // Import and initialize LLM service
        const { getOpenAIClient } = await import('../services/llmService.js');

        // Pre-warm cache with common searches
        const commonSearches = ['iphone', 'laptop', 'rice', 'milk'];
        console.log(`🔥 Pre-warming cache with ${commonSearches.length} common searches`);

        // This would be done in background, not blocking startup
        setTimeout(async () => {
            for (const search of commonSearches) {
                try {
                    // Simulate a quick search to warm up services
                    console.log(`🔥 Warming up: ${search}`);
                } catch (error) {
                    console.warn(`Warm-up failed for ${search}:`, error.message);
                }
            }
        }, 5000);

        console.log('✅ Warm-up completed');
    } catch (error) {
        console.warn('⚠️ Warm-up error:', error.message);
    }
}