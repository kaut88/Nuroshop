import OpenAI from 'openai';

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
    const client = getOpenAIClient();

    try {
        const prompt = `Extract a clean product search term from this user query. Return ONLY the product name/model, nothing else.

User query: "${userQuery}"

Examples:
"best apple phone under 80k" → "iPhone 15"
"gaming laptop with rtx 4060" → "gaming laptop RTX 4060"
"sony headphones wireless" → "Sony wireless headphones"

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

        const searchTerm = response.choices[0].message.content.trim();
        return searchTerm || userQuery;

    } catch (error) {
        console.error('LLM parsing error:', error);
        return userQuery;
    }
}

export async function getProductInfo(searchTerm, priceResults) {
    const client = getOpenAIClient();

    try {
        // Calculate price statistics
        const prices = priceResults.map(p => p.price);
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

        const content = response.choices[0].message.content.trim();

        // Try to parse JSON, handle markdown code blocks
        let jsonContent = content;
        if (content.includes('```json')) {
            jsonContent = content.split('```json')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            jsonContent = content.split('```')[1].split('```')[0].trim();
        }

        const productInfo = JSON.parse(jsonContent);

        return {
            productName: productInfo.productName || searchTerm,
            category: productInfo.category || 'Electronics',
            keyFeatures: productInfo.keyFeatures || [],
            description: productInfo.description || '',
            priceAnalysis: productInfo.priceAnalysis || '',
            recommendation: productInfo.recommendation || '',
            priceStats: {
                min: minPrice,
                max: maxPrice,
                average: avgPrice
            }
        };

    } catch (error) {
        console.error('Product info error:', error);

        // Fallback response
        const prices = priceResults.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

        return {
            productName: searchTerm,
            category: 'Product',
            keyFeatures: ['Available across multiple platforms', 'Compare prices easily', 'Best deals highlighted'],
            description: `${searchTerm} is available across multiple e-commerce platforms with varying prices.`,
            priceAnalysis: `Price ranges from ₹${minPrice.toLocaleString()} to ₹${maxPrice.toLocaleString()}.`,
            recommendation: 'Check the highlighted best deal for maximum savings.',
            priceStats: {
                min: minPrice,
                max: maxPrice,
                average: avgPrice
            }
        };
    }
}


export async function detectCategory(userQuery) {
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

        const category = response.choices[0].message.content.trim().toLowerCase();
        return category || 'general';

    } catch (error) {
        console.error('Category detection error:', error);
        return 'general';
    }
}
