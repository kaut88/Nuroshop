import axios from 'axios';
import * as cheerio from 'cheerio';

export async function searchJioMart(searchTerm) {
    try {
        const url = `https://www.jiomart.com/search/${encodeURIComponent(searchTerm)}`;

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            },
            timeout: 15000
        });

        const $ = cheerio.load(data);
        const products = [];

        $('.product-tile, .jm-product, [data-product]').slice(0, 20).each((_i, element) => {
            const $element = $(element);

            const title = $element.find('.product-title, h3, .jm-heading-xs').text().trim();
            const priceText = $element.find('.jm-heading-xxs, .final-price, .price').text().replace(/[,₹]/g, '');
            const image = $element.find('img').first().attr('src') || '';
            const linkPath = $element.find('a').first().attr('href') || '';
            const link = linkPath.startsWith('http') ? linkPath : 'https://www.jiomart.com' + linkPath;

            if (title && priceText && parseFloat(priceText) > 0) {
                products.push({
                    platform: 'JioMart',
                    title,
                    price: parseFloat(priceText),
                    link,
                    image: image || null,
                    currency: '₹',
                    category: 'Groceries'
                });
            }
        });

        console.log(`JioMart: Found ${products.length} products for "${searchTerm}"`);

        if (products.length === 0 && process.env.USE_MOCK_DATA === 'true') {
            return getMockJioMartData(searchTerm);
        }

        return products;

    } catch (error) {
        console.error('JioMart scraping error:', error.message);

        if (process.env.USE_MOCK_DATA === 'true') {
            return getMockJioMartData(searchTerm);
        }

        return [];
    }
}

function getMockJioMartData(searchTerm) {
    const isVegetable = /tomato|potato|onion|carrot|cabbage|vegetable|fruit|apple|banana|orange/i.test(searchTerm);
    const basePrice = isVegetable ? Math.floor(Math.random() * 80) + 15 : Math.floor(Math.random() * 400) + 40;
    const capitalizedTerm = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);

    return [
        {
            platform: 'JioMart',
            title: `${capitalizedTerm} - ${isVegetable ? 'Farm Fresh (1 kg)' : 'Value Pack'}`,
            price: basePrice,
            link: `https://www.jiomart.com/search/${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹',
            category: isVegetable ? 'Fresh Produce' : 'Groceries'
        }
    ];
}
