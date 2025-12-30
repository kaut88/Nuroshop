import { parseQuery, getProductInfo, detectCategory } from '../services/llmService_optimized.js';
import { searchAmazon } from '../services/amazonService.js';
import { searchFlipkart } from '../services/flipkartService.js';
import { searchBigBasket } from '../services/bigbasketService.js';
import { searchJioMart } from '../services/jiomartService.js';
import { compareAndSort } from '../utils/priceComparison.js';
import { analyzePrices } from '../utils/priceAnalyzer.js';
import { cache } from '../utils/cache.js';

export async function searchProducts(req, res) {
    const startTime = Date.now();

    try {
        const { query } = req.body;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Check cache first
        const cacheKey = `search:${query.toLowerCase().trim()}`;
        if (cache.has(cacheKey)) {
            console.log(`Cache hit for: ${query}`);
            const cachedResult = cache.get(cacheKey);
            return res.json({ ...cachedResult, cached: true, responseTime: Date.now() - startTime });
        }

        // Step 1: Parse query with LLM and detect category (parallel)
        const [searchTerm, category] = await Promise.all([
            parseQuery(query),
            detectCategory(query)
        ]);

        // Step 2: Fetch from platforms with timeout and error handling
        const platformPromises = [];
        const TIMEOUT = 8000; // 8 seconds timeout

        // Create timeout wrapper
        const withTimeout = (promise, name) => {
            return Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`${name} timeout`)), TIMEOUT)
                )
            ]).catch(error => {
                console.warn(`${name} failed:`, error.message);
                return [];
            });
        };

        // Always search electronics platforms
        platformPromises.push(withTimeout(searchAmazon(searchTerm), 'Amazon'));
        platformPromises.push(withTimeout(searchFlipkart(searchTerm), 'Flipkart'));

        // Add grocery platforms for food/vegetables/groceries
        if (category === 'groceries' || category === 'vegetables' || category === 'food') {
            platformPromises.push(withTimeout(searchBigBasket(searchTerm), 'BigBasket'));
            platformPromises.push(withTimeout(searchJioMart(searchTerm), 'JioMart'));
        }

        // Execute all searches in parallel
        const results = await Promise.all(platformPromises);

        // Step 3: Combine and filter results
        const allResults = results.flat().filter(product =>
            product &&
            product.price > 0 &&
            product.title &&
            product.title.length > 3
        );

        // Step 4: Compare and sort (lowest price first)
        const sortedResults = compareAndSort(allResults);

        // Add savings information
        if (sortedResults.length > 1) {
            const lowestPrice = sortedResults[0].price;
            sortedResults.forEach((product, index) => {
                if (index > 0) {
                    product.savingsAmount = product.price - lowestPrice;
                    product.savingsPercentage = Math.round(((product.price - lowestPrice) / product.price) * 100);
                }
            });
        }

        // Step 5: Analyze prices and create summary
        const priceAnalysis = analyzePrices(sortedResults);

        const response = {
            query,
            searchTerm,
            category,
            results: sortedResults.slice(0, 15), // Limit to 15 results
            count: sortedResults.length,
            productInfo: null, // Will be populated async
            priceAnalysis,
            platforms: [...new Set(sortedResults.map(r => r.platform))],
            responseTime: Date.now() - startTime
        };

        // Cache the response
        cache.set(cacheKey, response, 300); // 5 minutes

        // Get AI product info async (don't wait)
        if (sortedResults.length > 0) {
            getProductInfo(searchTerm, sortedResults)
                .then(info => {
                    const cachedData = cache.get(cacheKey);
                    if (cachedData) {
                        cachedData.productInfo = info;
                        cache.set(cacheKey, cachedData, 300);
                    }
                })
                .catch(err => console.warn('Product info error:', err.message));
        }

        res.json(response);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            error: 'Failed to search products',
            message: error.message,
            responseTime: Date.now() - startTime
        });
    }
}