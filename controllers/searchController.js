import { parseQuery, getProductInfo, detectCategory } from '../services/llmService.js';
import { searchAmazon } from '../services/amazonService.js';
import { searchFlipkart } from '../services/flipkartService.js';
import { searchBigBasket } from '../services/bigbasketService.js';
import { searchJioMart } from '../services/jiomartService.js';
import { compareAndSort } from '../utils/priceComparison.js';
import { analyzePrices } from '../utils/priceAnalyzer.js';
import { asyncHandler } from '../middleware/index.js';
import { searchCache, generateSearchKey } from '../utils/cache.js';

export const searchProducts = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { query } = req.body;

    console.log(`🔍 Search request: "${query}"`);

    // Check cache first
    const cacheKey = generateSearchKey(query, 'all');
    const cachedResult = searchCache.get(cacheKey);

    if (cachedResult) {
        console.log(`📋 Cache hit! Returning cached results in ${Date.now() - startTime}ms`);
        return res.json({
            ...cachedResult,
            metadata: {
                ...cachedResult.metadata,
                fromCache: true,
                processingTime: Date.now() - startTime
            }
        });
    }

    try {
        // Step 1: Parse query with LLM and detect category (parallel with timeout)
        const llmTimeout = 8000; // 8 seconds max for LLM calls
        const [searchTerm, category] = await Promise.race([
            Promise.all([
                parseQuery(query).catch(err => {
                    console.warn('LLM parsing failed, using original query:', err.message);
                    return query;
                }),
                detectCategory(query).catch(err => {
                    console.warn('Category detection failed, using general:', err.message);
                    return 'general';
                })
            ]),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('LLM timeout')), llmTimeout)
            )
        ]).catch(() => {
            console.warn('LLM operations timed out, using fallbacks');
            return [query, 'general'];
        });

        console.log(`📝 Parsed term: "${searchTerm}", Category: ${category}`);

        // Step 2: Determine platforms and search with shorter timeout
        const platformPromises = [];
        const selectedPlatforms = [];

        // Always search electronics platforms
        platformPromises.push(
            Promise.race([
                searchAmazon(searchTerm),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Amazon timeout')), 6000))
            ]).catch(err => {
                console.warn('Amazon search failed:', err.message);
                return [];
            })
        );
        selectedPlatforms.push('Amazon');

        platformPromises.push(
            Promise.race([
                searchFlipkart(searchTerm),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Flipkart timeout')), 6000))
            ]).catch(err => {
                console.warn('Flipkart search failed:', err.message);
                return [];
            })
        );
        selectedPlatforms.push('Flipkart');

        // Add grocery platforms for food/vegetables/groceries
        if (['groceries', 'vegetables', 'food'].includes(category)) {
            platformPromises.push(
                Promise.race([
                    searchBigBasket(searchTerm),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('BigBasket timeout')), 6000))
                ]).catch(err => {
                    console.warn('BigBasket search failed:', err.message);
                    return [];
                })
            );
            selectedPlatforms.push('BigBasket');

            platformPromises.push(
                Promise.race([
                    searchJioMart(searchTerm),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('JioMart timeout')), 6000))
                ]).catch(err => {
                    console.warn('JioMart search failed:', err.message);
                    return [];
                })
            );
            selectedPlatforms.push('JioMart');
        }

        console.log(`🌐 Searching platforms: ${selectedPlatforms.join(', ')}`);

        // Step 3: Execute all platform searches with global timeout
        const searchTimeout = 12000; // 12 seconds max for all searches
        const results = await Promise.race([
            Promise.allSettled(platformPromises),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Global search timeout')), searchTimeout)
            )
        ]);

        // Step 4: Combine and validate results
        const allResults = [];
        let successfulPlatforms = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                allResults.push(...result.value);
                if (result.value.length > 0) {
                    successfulPlatforms++;
                }
                console.log(`✅ ${selectedPlatforms[index]}: ${result.value.length} products`);
            } else {
                console.log(`❌ ${selectedPlatforms[index]}: Failed`);
            }
        });

        // Step 5: Process and sort results
        const sortedResults = compareAndSort(allResults);
        console.log(`📊 Total valid products: ${sortedResults.length}`);

        // Step 6: Add savings information
        if (sortedResults.length > 1) {
            const lowestPrice = sortedResults[0].price;
            sortedResults.forEach((product, index) => {
                if (index > 0) {
                    product.savingsAmount = product.price - lowestPrice;
                    product.savingsPercentage = Math.round(((product.price - lowestPrice) / product.price) * 100);
                }
            });
        }

        // Step 7: Get AI-powered product info (with timeout, fallback if fails)
        let productInfo = null;
        if (sortedResults.length > 0) {
            try {
                productInfo = await Promise.race([
                    getProductInfo(searchTerm, sortedResults),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Product info timeout')), 5000)
                    )
                ]);
                console.log('✅ Product info generated');
            } catch (error) {
                console.warn('Product info generation failed/timed out:', error.message);
                // Use fallback product info
                productInfo = {
                    productName: searchTerm,
                    category: category,
                    keyFeatures: ['Multi-platform comparison', 'Best price tracking', 'Real-time data'],
                    description: `${searchTerm} price comparison across multiple platforms.`,
                    priceAnalysis: `Found ${sortedResults.length} options with competitive pricing.`,
                    recommendation: 'Compare prices and choose the best deal for your needs.'
                };
            }
        }

        // Step 8: Analyze prices (fast operation)
        const priceAnalysis = sortedResults.length > 0 ? analyzePrices(sortedResults) : null;

        const processingTime = Date.now() - startTime;
        console.log(`⚡ Search completed in ${processingTime}ms`);

        // Step 9: Prepare response
        const response = {
            success: true,
            query,
            searchTerm,
            category,
            results: sortedResults,
            count: sortedResults.length,
            productInfo,
            priceAnalysis,
            platforms: [...new Set(sortedResults.map(r => r.platform))],
            metadata: {
                searchedPlatforms: selectedPlatforms,
                successfulPlatforms,
                processingTime,
                fromCache: false,
                timestamp: new Date().toISOString()
            }
        };

        // Cache the response for 5 minutes if we have results
        if (sortedResults.length > 0) {
            searchCache.set(cacheKey, response, 300000); // 5 minutes
            console.log(`💾 Results cached for future requests`);
        }

        res.json(response);

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Search failed after ${processingTime}ms:`, error);

        // Return structured error response
        res.status(500).json({
            success: false,
            error: 'Search failed',
            message: process.env.NODE_ENV === 'production'
                ? 'Unable to complete search at this time'
                : error.message,
            query,
            metadata: {
                processingTime,
                fromCache: false,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get search statistics
export const getSearchStats = asyncHandler(async (req, res) => {
    const cacheStats = searchCache.getStats();

    res.json({
        success: true,
        stats: {
            totalPlatforms: 4,
            supportedCategories: ['electronics', 'groceries', 'vegetables', 'food', 'general'],
            features: [
                'AI-powered query parsing',
                'Multi-platform price comparison',
                'Smart category detection',
                'Price analysis and insights',
                'Response caching for faster results'
            ],
            cache: {
                size: cacheStats.size,
                enabled: true
            }
        },
        timestamp: new Date().toISOString()
    });
});

// Clear cache endpoint (for admin use)
export const clearCache = asyncHandler(async (req, res) => {
    searchCache.clear();

    res.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
    });
});
