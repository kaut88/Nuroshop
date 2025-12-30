import OpenAI from 'openai';

let openai = null;
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getOpenAIClient() {
    if (!openai) {
        const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error('No API key found. Please set GROQ_API_KEY or OPENAI_API_KEY environment variable.');
        }

        const baseURL = process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined;

        openai = new OpenAI({
            apiKey,
            baseURL,
            timeout: 30000, // 30 seconds timeout
            maxRetries: 2
        });
    }
    return openai;
}

// Cache helper functions
function getCacheKey(type, input) {
    return `${type}:${input.toLowerCase().trim()}`;
}

function getFromCache(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (cache.size > 100) {
        const now = Date.now();
        for (const [k, v] of cache.entries()) {
            if (now - v.timestamp > CACHE_TTL) {
                cache.delete(k);
            }
        }
    }
}

export async function parseQuery(userQuery) {
    if (!userQuery || typeof userQuery !== 'string') {
        throw new Error('Invalid query input');
    }

    const cacheKey = getCacheKey('parse', userQuery);
    const cached = getFromCache(cacheKey);
    if (cached) {
        console.log('📋 Using cached query parsing');
        return cached;
    }

    const client = getOpenAIClient();

    try {
        const prompt = `Extract a clean product search term from this user query. Return ONLY the product name/model, nothing else.

User query: "${userQuery}"

Examples:
"best apple phone under 80k" → "iPhone 15"
"gaming laptop with rtx 4060" → "gaming laptop RTX 4060"
"sony headphones wireless" → "Sony wireless headphones"
"fresh organic tomatoes" → "organic tomatoes"

Search term:`;

        const response = await client.chat.completions.create({
            model: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a product search assistant. Extract clean, searchable product terms.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 50
        });

        const searchTerm = response.choices[0]?.message?.content?.trim();
        const result = searchTerm || userQuery;

        setCache(cacheKey, result);
        return result;

    } catch (error) {
        console.error('LLM parsing error:', error);

        // Fallback: basic cleaning
        const fallback = userQuery
            .replace(/\b(best|good|cheap|under|above|below|around)\b/gi, '')
            .replace(/\b\d+k?\b/g, '')
            .trim();

        return fallback || userQuery;
    }
}

export async function getProductInfo(searchTerm, priceResults) {
    if (!searchTerm || !Array.isArray(priceResults) || priceResults.length === 0) {
        throw new Error('Invalid input for product info generation');
    }

    const cacheKey = getCacheKey('info', searchTerm);
    const cached = getFromCache(cacheKey);
    if (cached) {
        console.log('📋 Using cached product info');
        return cached;
    }

    const client = getOpenAIClient();

    try {
        // Calculate price statistics
        const prices = priceResults.map(p => p.price).filter(p => p > 0);
        if (prices.length === 0) {
            throw new Error('No valid prices found');
        }

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

        const prompt = `You are a product expert. Provide detailed information about: "${searchTerm}"

Available prices: ₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()} (Average: ₹${avgPrice.toLocaleString()})

Provide a comprehensive response in JSON format with:
1. productName: Official product name
2. category: Product category
3. keyFeatures: Array of 4-5 key features/specifications
4. description: Brief 2-3 sentence description
5. priceAnalysis: Brief analysis of the price range
6. recommendation: One sentence buying recommendation

Return ONLY valid JSON, no markdown or extra text.`;

        const response = await client.chat.completions.create({
            model: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a product expert providing detailed, accurate information. Always respond with valid JSON only.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) {
            throw new Error('Empty response from LLM');
        }

        // Try to parse JSON, handle markdown code blocks
        let jsonContent = content;
        if (content.includes('```json')) {
            jsonContent = content.split('```json')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            jsonContent = content.split('```')[1].split('```')[0].trim();
        }

        const productInfo = JSON.parse(jsonContent);

        const result = {
            productName: productInfo.productName || searchTerm,
            category: productInfo.category || 'Electronics',
            keyFeatures: Array.isArray(productInfo.keyFeatures) ? productInfo.keyFeatures : [],
            description: productInfo.description || '',
            priceAnalysis: productInfo.priceAnalysis || '',
            recommendation: productInfo.recommendation || '',
            priceStats: {
                min: minPrice,
                max: maxPrice,
                average: avgPrice,
                count: prices.length
            }
        };

        setCache(cacheKey, result);
        return result;

    } catch (error) {
        console.error('Product info error:', error);

        // Enhanced fallback response
        const prices = priceResults.map(p => p.price).filter(p => p > 0);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

        return {
            productName: searchTerm,
            category: 'Product',
            keyFeatures: [
                'Available across multiple platforms',
                'Price comparison enabled',
                'Best deals highlighted',
                'Real-time price data'
            ],
            description: `${searchTerm} is available across multiple e-commerce platforms with competitive pricing.`,
            priceAnalysis: `Price ranges from ₹${minPrice.toLocaleString()} to ₹${maxPrice.toLocaleString()} with an average of ₹${avgPrice.toLocaleString()}.`,
            recommendation: 'Compare prices across platforms and choose the best deal for your needs.',
            priceStats: {
                min: minPrice,
                max: maxPrice,
                average: avgPrice,
                count: prices.length
            }
        };
    }
}

export async function detectCategory(userQuery) {
    if (!userQuery || typeof userQuery !== 'string') {
        return 'general';
    }

    const cacheKey = getCacheKey('category', userQuery);
    const cached = getFromCache(cacheKey);
    if (cached) {
        console.log('📋 Using cached category detection');
        return cached;
    }

    // Quick keyword-based detection first
    const query = userQuery.toLowerCase();
    const keywords = {
        electronics: ['phone', 'laptop', 'computer', 'tablet', 'headphone', 'speaker', 'camera', 'tv', 'gaming', 'iphone', 'samsung', 'apple'],
        groceries: ['rice', 'wheat', 'flour', 'oil', 'milk', 'bread', 'sugar', 'salt', 'spice', 'dal', 'pulses'],
        vegetables: ['tomato', 'potato', 'onion', 'carrot', 'cabbage', 'spinach', 'broccoli', 'vegetable', 'fresh', 'organic'],
        food: ['food', 'snack', 'biscuit', 'chocolate', 'juice', 'drink', 'meal', 'ready']
    };

    for (const [category, words] of Object.entries(keywords)) {
        if (words.some(word => query.includes(word))) {
            setCache(cacheKey, category);
            return category;
        }
    }

    // Fallback to LLM if no keywords match
    const client = getOpenAIClient();

    try {
        const prompt = `Detect the product category from this query. Return ONLY ONE word: electronics, groceries, vegetables, food, or general.

Query: "${userQuery}"

Examples:
"iPhone 15" → electronics
"fresh tomatoes" → vegetables
"rice 5kg" → groceries
"gaming laptop" → electronics
"organic vegetables" → vegetables
"milk" → groceries

Category:`;

        const response = await client.chat.completions.create({
            model: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a category detection assistant. Return only one word.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 10
        });

        const category = response.choices[0]?.message?.content?.trim()?.toLowerCase();
        const result = ['electronics', 'groceries', 'vegetables', 'food'].includes(category) ? category : 'general';

        setCache(cacheKey, result);
        return result;

    } catch (error) {
        console.error('Category detection error:', error);
        return 'general';
    }
}
