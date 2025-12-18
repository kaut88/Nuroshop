export function analyzePrices(products) {
    if (!products || products.length === 0) {
        return null;
    }

    const prices = products.map(p => p.price).sort((a, b) => a - b);
    const min = prices[0];
    const max = prices[prices.length - 1];
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const median = prices[Math.floor(prices.length / 2)];

    // Create price categories
    const priceRange = max - min;
    const categorySize = priceRange / 4;

    const categories = {
        budget: {
            label: 'Budget',
            range: `₹${min.toLocaleString()} - ₹${Math.round(min + categorySize).toLocaleString()}`,
            min: min,
            max: Math.round(min + categorySize),
            products: []
        },
        affordable: {
            label: 'Affordable',
            range: `₹${Math.round(min + categorySize).toLocaleString()} - ₹${Math.round(min + categorySize * 2).toLocaleString()}`,
            min: Math.round(min + categorySize),
            max: Math.round(min + categorySize * 2),
            products: []
        },
        premium: {
            label: 'Premium',
            range: `₹${Math.round(min + categorySize * 2).toLocaleString()} - ₹${Math.round(min + categorySize * 3).toLocaleString()}`,
            min: Math.round(min + categorySize * 2),
            max: Math.round(min + categorySize * 3),
            products: []
        },
        luxury: {
            label: 'Luxury',
            range: `₹${Math.round(min + categorySize * 3).toLocaleString()} - ₹${max.toLocaleString()}`,
            min: Math.round(min + categorySize * 3),
            max: max,
            products: []
        }
    };

    // Categorize products
    products.forEach(product => {
        if (product.price <= categories.budget.max) {
            categories.budget.products.push(product);
        } else if (product.price <= categories.affordable.max) {
            categories.affordable.products.push(product);
        } else if (product.price <= categories.premium.max) {
            categories.premium.products.push(product);
        } else {
            categories.luxury.products.push(product);
        }
    });

    // Platform distribution
    const platformCounts = {};
    products.forEach(product => {
        platformCounts[product.platform] = (platformCounts[product.platform] || 0) + 1;
    });

    return {
        total: products.length,
        priceStats: {
            lowest: min,
            highest: max,
            average: avg,
            median: median,
            range: priceRange
        },
        categories: categories,
        platforms: Object.keys(platformCounts).map(platform => ({
            name: platform,
            count: platformCounts[platform],
            percentage: Math.round((platformCounts[platform] / products.length) * 100)
        })),
        summary: {
            lowestOption: products[0],
            highestOption: products[products.length - 1],
            savingsOpportunity: max - min
        }
    };
}
