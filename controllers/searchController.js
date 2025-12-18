import { parseQuery, getProductInfo, detectCategory } from '../services/llmService.js';
import { searchAmazon } from '../services/amazonService.js';
import { searchFlipkart } from '../services/flipkartService.js';
import { searchBigBasket } from '../services/bigbasketService.js';
import { searchJioMart } from '../services/jiomartService.js';
import { compareAndSort } from '../utils/priceComparison.js';
import { analyzePrices } from '../utils/priceAnalyzer.js';

export async function searchProducts(req, res) {
    try {
        const { query } = req.body;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Step 1: Parse query with LLM and detect category
        const [searchTerm, category] = await Promise.all([
            parseQuery(query),
            detectCategory(query)
        ]);

        // Step 2: Fetch from appropriate platforms based on category
        const platformPromises = [];

        // Always search electronics platforms
        platformPromises.push(searchAmazon(searchTerm));
        platformPromises.push(searchFlipkart(searchTerm));

        // Add grocery platforms for food/vegetables/groceries
        if (category === 'groceries' || category === 'vegetables' || category === 'food') {
            platformPromises.push(searchBigBasket(searchTerm));
            platformPromises.push(searchJioMart(searchTerm));
        }

        const results = await Promise.allSettled(platformPromises);

        // Step 3: Combine results
        const allResults = [];

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                allResults.push(...result.value);
            }
        });

        // Step 4: Compare and sort (lowest price first)
        const sortedResults = compareAndSort(allResults);

        // Add savings information
        if (sortedResults.length > 1) {
            const lowestPrice = sortedResults[0].price;
            sortedResults.forEach((product, index) => {
                if (index > 0) {
                    product.savingsAmount = product.price - lowestPrice;
                }
            });
        }

        // Step 5: Get AI-powered product information
        let productInfo = null;
        if (sortedResults.length > 0) {
            productInfo = await getProductInfo(searchTerm, sortedResults);
        }

        // Step 6: Analyze prices and create summary
        const priceAnalysis = analyzePrices(sortedResults);

        res.json({
            query,
            searchTerm,
            category,
            results: sortedResults,
            count: sortedResults.length,
            productInfo,
            priceAnalysis,
            platforms: [...new Set(sortedResults.map(r => r.platform))]
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            error: 'Failed to search products',
            message: error.message
        });
    }
}
