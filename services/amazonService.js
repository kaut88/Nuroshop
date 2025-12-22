import axios from 'axios';
import * as cheerio from 'cheerio';

export async function searchAmazon(searchTerm) {
    try {
        const url = `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`;

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none'
            },
            timeout: 15000
        });

        const $ = cheerio.load(data);
        const products = [];

        $('[data-component-type="s-search-result"]').slice(0, 20).each((_i, element) => {
            const $element = $(element);

            // Extract title
            const title = $element.find('h2 a span').text().trim();

            // Extract price (try multiple selectors)
            let priceText = $element.find('.a-price-whole').first().text().replace(/[,₹]/g, '');
            if (!priceText) {
                priceText = $element.find('.a-price .a-offscreen').first().text().replace(/[,₹]/g, '');
            }

            // Extract image
            const image = $element.find('img.s-image').attr('src') ||
                $element.find('img').first().attr('src') || '';

            // Extract link
            const linkPath = $element.find('h2 a').attr('href') || '';
            const link = linkPath.startsWith('http') ? linkPath : 'https://www.amazon.in' + linkPath;

            if (title && priceText && parseFloat(priceText) > 0) {
                products.push({
                    platform: 'Amazon',
                    title,
                    price: parseFloat(priceText),
                    link,
                    image: image || null,
                    currency: '₹'
                });
            }
        });

        console.log(`Amazon: Found ${products.length} products for "${searchTerm}"`);

        if (products.length === 0 && process.env.USE_MOCK_DATA === 'true') {
            return getMockAmazonData(searchTerm);
        }

        return products;

    } catch (error) {
        console.error('Amazon scraping error:', error.message);

        if (process.env.USE_MOCK_DATA === 'true') {
            return getMockAmazonData(searchTerm);
        }

        return [];
    }
}

function getMockAmazonData(searchTerm) {
    const capitalizedTerm = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
    const lowerTerm = searchTerm.toLowerCase();

    // Smart price ranges based on product type
    let priceRange = { min: 15000, max: 45000 }; // Default for electronics

    // Food & Beverages
    if (lowerTerm.includes('water') || lowerTerm.includes('bottle') || lowerTerm.includes('juice') ||
        lowerTerm.includes('drink') || lowerTerm.includes('beverage') || lowerTerm.includes('soda')) {
        priceRange = { min: 50, max: 500 };
    }
    // Groceries & Food Items
    else if (lowerTerm.includes('rice') || lowerTerm.includes('flour') || lowerTerm.includes('oil') ||
        lowerTerm.includes('milk') || lowerTerm.includes('bread') || lowerTerm.includes('sugar') ||
        lowerTerm.includes('salt') || lowerTerm.includes('spice') || lowerTerm.includes('dal') ||
        lowerTerm.includes('vegetable') || lowerTerm.includes('fruit') || lowerTerm.includes('snack')) {
        priceRange = { min: 100, max: 2000 };
    }
    // Personal Care & Health
    else if (lowerTerm.includes('soap') || lowerTerm.includes('shampoo') || lowerTerm.includes('toothpaste') ||
        lowerTerm.includes('cream') || lowerTerm.includes('lotion') || lowerTerm.includes('medicine')) {
        priceRange = { min: 150, max: 1500 };
    }
    // Clothing & Accessories
    else if (lowerTerm.includes('shirt') || lowerTerm.includes('pant') || lowerTerm.includes('shoe') ||
        lowerTerm.includes('bag') || lowerTerm.includes('watch') || lowerTerm.includes('cloth')) {
        priceRange = { min: 500, max: 5000 };
    }
    // Books & Stationery
    else if (lowerTerm.includes('book') || lowerTerm.includes('pen') || lowerTerm.includes('notebook') ||
        lowerTerm.includes('paper') || lowerTerm.includes('pencil')) {
        priceRange = { min: 50, max: 1000 };
    }
    // Home & Kitchen
    else if (lowerTerm.includes('plate') || lowerTerm.includes('cup') || lowerTerm.includes('spoon') ||
        lowerTerm.includes('bowl') || lowerTerm.includes('kitchen') || lowerTerm.includes('utensil')) {
        priceRange = { min: 200, max: 3000 };
    }
    // Electronics (phones, laptops, etc.)
    else if (lowerTerm.includes('phone') || lowerTerm.includes('laptop') || lowerTerm.includes('computer') ||
        lowerTerm.includes('tablet') || lowerTerm.includes('tv') || lowerTerm.includes('camera')) {
        priceRange = { min: 10000, max: 80000 };
    }
    // Headphones & Audio
    else if (lowerTerm.includes('headphone') || lowerTerm.includes('speaker') || lowerTerm.includes('earphone') ||
        lowerTerm.includes('audio') || lowerTerm.includes('music')) {
        priceRange = { min: 500, max: 15000 };
    }

    // Generate consistent prices based on search term
    const searchHash = searchTerm.toLowerCase().split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);

    const priceSpread = priceRange.max - priceRange.min;
    const basePrice = Math.abs(searchHash % priceSpread) + priceRange.min;
    const variation = Math.floor(priceSpread * 0.1); // 10% variation

    return [
        {
            platform: 'Amazon',
            title: `${capitalizedTerm} - Premium Quality Edition`,
            price: Math.round(basePrice),
            link: `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹'
        },
        {
            platform: 'Amazon',
            title: `${capitalizedTerm} - Best Seller 2024`,
            price: Math.round(basePrice + variation),
            link: `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹'
        }
    ];
}
