import axios from 'axios';
import * as cheerio from 'cheerio';

export async function searchFlipkart(searchTerm) {
    try {
        const url = `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`;

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

        // Try multiple selectors for Flipkart's dynamic structure
        const productSelectors = [
            '[data-id]',
            '._1AtVbE',
            '._13oc-S',
            '.tUxRFH'
        ];

        let foundProducts = false;
        for (const selector of productSelectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                elements.slice(0, 20).each((_i, element) => {
                    const $element = $(element);

                    // Extract title (try multiple selectors)
                    const title = $element.find('a.wjcEIp, a.WKTcLC, a.IRpwTa, a.s1Q9rs, .KzDlHZ').text().trim() ||
                        $element.find('a[title]').attr('title') || '';

                    // Extract price (try multiple selectors)
                    const priceText = $element.find('div.Nx9bqj, div._30jeq3, div._1_WHN1, ._30jeq3').text().replace(/[,₹]/g, '');

                    // Extract image
                    const image = $element.find('img').first().attr('src') || '';

                    // Extract link
                    const linkPath = $element.find('a').first().attr('href') || '';
                    const link = linkPath.startsWith('http') ? linkPath : 'https://www.flipkart.com' + linkPath;

                    if (title && priceText && parseFloat(priceText) > 0) {
                        products.push({
                            platform: 'Flipkart',
                            title,
                            price: parseFloat(priceText),
                            link,
                            image: image || null,
                            currency: '₹'
                        });
                        foundProducts = true;
                    }
                });

                if (foundProducts) break;
            }
        }

        console.log(`Flipkart: Found ${products.length} products for "${searchTerm}"`);

        if (products.length === 0 && process.env.USE_MOCK_DATA === 'true') {
            return getMockFlipkartData(searchTerm);
        }

        return products;

    } catch (error) {
        console.error('Flipkart scraping error:', error.message);

        if (process.env.USE_MOCK_DATA === 'true') {
            return getMockFlipkartData(searchTerm);
        }

        return [];
    }
}

function getMockFlipkartData(searchTerm) {
    const capitalizedTerm = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
    const lowerTerm = searchTerm.toLowerCase();

    // Smart price ranges based on product type (slightly lower than Amazon)
    let priceRange = { min: 12000, max: 40000 }; // Default for electronics

    // Food & Beverages
    if (lowerTerm.includes('water') || lowerTerm.includes('bottle') || lowerTerm.includes('juice') ||
        lowerTerm.includes('drink') || lowerTerm.includes('beverage') || lowerTerm.includes('soda')) {
        priceRange = { min: 40, max: 450 };
    }
    // Groceries & Food Items
    else if (lowerTerm.includes('rice') || lowerTerm.includes('flour') || lowerTerm.includes('oil') ||
        lowerTerm.includes('milk') || lowerTerm.includes('bread') || lowerTerm.includes('sugar') ||
        lowerTerm.includes('salt') || lowerTerm.includes('spice') || lowerTerm.includes('dal') ||
        lowerTerm.includes('vegetable') || lowerTerm.includes('fruit') || lowerTerm.includes('snack')) {
        priceRange = { min: 80, max: 1800 };
    }
    // Personal Care & Health
    else if (lowerTerm.includes('soap') || lowerTerm.includes('shampoo') || lowerTerm.includes('toothpaste') ||
        lowerTerm.includes('cream') || lowerTerm.includes('lotion') || lowerTerm.includes('medicine')) {
        priceRange = { min: 120, max: 1300 };
    }
    // Clothing & Accessories
    else if (lowerTerm.includes('shirt') || lowerTerm.includes('pant') || lowerTerm.includes('shoe') ||
        lowerTerm.includes('bag') || lowerTerm.includes('watch') || lowerTerm.includes('cloth')) {
        priceRange = { min: 400, max: 4500 };
    }
    // Books & Stationery
    else if (lowerTerm.includes('book') || lowerTerm.includes('pen') || lowerTerm.includes('notebook') ||
        lowerTerm.includes('paper') || lowerTerm.includes('pencil')) {
        priceRange = { min: 40, max: 900 };
    }
    // Home & Kitchen
    else if (lowerTerm.includes('plate') || lowerTerm.includes('cup') || lowerTerm.includes('spoon') ||
        lowerTerm.includes('bowl') || lowerTerm.includes('kitchen') || lowerTerm.includes('utensil')) {
        priceRange = { min: 150, max: 2500 };
    }
    // Electronics (phones, laptops, etc.)
    else if (lowerTerm.includes('phone') || lowerTerm.includes('laptop') || lowerTerm.includes('computer') ||
        lowerTerm.includes('tablet') || lowerTerm.includes('tv') || lowerTerm.includes('camera')) {
        priceRange = { min: 8000, max: 75000 };
    }
    // Headphones & Audio
    else if (lowerTerm.includes('headphone') || lowerTerm.includes('speaker') || lowerTerm.includes('earphone') ||
        lowerTerm.includes('audio') || lowerTerm.includes('music')) {
        priceRange = { min: 400, max: 12000 };
    }

    // Generate consistent prices based on search term
    const searchHash = searchTerm.toLowerCase().split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);

    const priceSpread = priceRange.max - priceRange.min;
    const basePrice = Math.abs(searchHash % priceSpread) + priceRange.min;
    const variation = Math.floor(priceSpread * 0.08); // 8% variation (slightly less than Amazon)

    return [
        {
            platform: 'Flipkart',
            title: `${capitalizedTerm} - Top Rated Pro Model`,
            price: Math.round(basePrice),
            link: `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹'
        },
        {
            platform: 'Flipkart',
            title: `${capitalizedTerm} - Special Edition Plus`,
            price: Math.round(basePrice + variation),
            link: `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹'
        }
    ];
}
