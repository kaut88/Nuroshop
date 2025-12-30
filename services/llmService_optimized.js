import OpenAI from 'openai';
import { cache } from '../utils/cache.js';

let openai = null;

function getOpenAIClient() {
    if (!openai) {
        const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
        const baseURL = process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined;

        openai = new OpenAI({
            apiKey,
            baseURL
        });
    }
    return openai;
}

export async function parseQuery(userQuery) {
    const cacheKey = `parse:${userQuery.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const client = getOpenAIClient();

    try {
        const prompt = `Extract clean product search term from: "${userQuery}"\nReturn ONLY the product name/model:\n\nExamples:\n"best apple phone under 80k" → "iPhone 15"\n"gaming laptop with rtx 4060" → "gaming laptop RTX 4060"\n"sony headphones wireless" → "Sony wireless headphones"\n\nSearch term:`;

        const response = await client.chat.completions.create({
            model: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'Extract clean, searchable product terms. Be concise.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 30
        });

        const searchTerm = response.choices[0].message.content.trim();
        const result = searchTerm || userQuery;
        cache.set(cacheKey, result, 600); // 10 minutes
        return result;

    } catch (error) {
        console.error('LLM parsing error:', error);
        return userQuery;
    }
}

export async function detectCategory(userQuery) {
    const cacheKey = `category:${userQuery.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    // Fast category detection using keywords
    const query = userQuery.toLowerCase();
    
    const categories = {
        vegetables: ['tomato', 'potato', 'onion', 'carrot', 'cabbage', 'spinach', 'broccoli', 'vegetables', 'veggie'],
        groceries: ['rice', 'wheat', 'flour', 'oil', 'milk', 'bread', 'sugar', 'salt', 'grocery', 'groceries'],
        food: ['food', 'snacks', 'biscuit', 'chocolate', 'juice', 'tea', 'coffee'],
        electronics: ['phone', 'laptop', 'tv', 'camera', 'headphone', 'speaker', 'tablet', 'watch', 'iphone', 'samsung', 'sony', 'lg', 'dell', 'hp', 'lenovo']
    };

    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => query.includes(keyword))) {
            cache.set(cacheKey, category, 600);
            return category;
        }
    }

    cache.set(cacheKey, 'electronics', 600);
    return 'electronics';
}

export async function getProductInfo(searchTerm, priceResults) {
    const cacheKey = `info:${searchTerm.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const client = getOpenAIClient();

    try {
        const prices = priceResults.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

        const prompt = `Product: "${searchTerm}"\nPrice range: ₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}\n\nProvide JSON with:\n- productName\n- category\n- keyFeatures (3-4 items)\n- description (1-2 sentences)\n- recommendation (1 sentence)\n\nJSON only:`;

        const response = await client.chat.completions.create({
            model: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'Product expert. Return valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.5,
            max_tokens: 300
        });

        let content = response.choices[0].message.content.trim();
        
        // Clean JSON
        if (content.includes('```')) {
            content = content.split('```')[1].replace('json', '').trim();
        }

        const productInfo = JSON.parse(content);

        const result = {
            productName: productInfo.productName || searchTerm,
            category: productInfo.category || 'Electronics',
            keyFeatures: productInfo.keyFeatures || [],
            description: productInfo.description || '',
            recommendation: productInfo.recommendation || '',
            priceStats: { min: minPrice, max: maxPrice, average: avgPrice }
        };

        cache.set(cacheKey, result, 1800); // 30 minutes
        return result;

    } catch (error) {
        console.error('Product info error:', error);

        const prices = priceResults.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

        return {
            productName: searchTerm,
            category: 'Product',
            keyFeatures: ['Multi-platform availability', 'Price comparison', 'Best deals'],
            description: `${searchTerm} available across multiple platforms.`,
            recommendation: 'Compare prices for best deals.',
            priceStats: { min: minPrice, max: maxPrice, average: avgPrice }
        };
    }
}