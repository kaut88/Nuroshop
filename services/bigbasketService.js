import axios from 'axios';
import * as cheerio from 'cheerio';

export async function searchBigBasket(searchTerm) {
    try {
        const url = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`;

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

        // Try multiple selectors for BigBasket
        $('.SKUDeck, .product, [data-qa="product"]').slice(0, 20).each((_i, element) => {
            const $element = $(element);

            const title = $element.find('.SKUDeck___StyledH, h3, .product-name').text().trim();
            const priceText = $element.find('.Pricing___StyledLabel, .discnt-price, .price').text().replace(/[,₹]/g, '');
            const image = $element.find('img').first().attr('src') || '';
            const linkPath = $element.find('a').first().attr('href') || '';
            const link = linkPath.startsWith('http') ? linkPath : 'https://www.bigbasket.com' + linkPath;

            if (title && priceText && parseFloat(priceText) > 0) {
                products.push({
                    platform: 'BigBasket',
                    title,
                    price: parseFloat(priceText),
                    link,
                    image: image || null,
                    currency: '₹',
                    category: 'Groceries'
                });
            }
        });

        console.log(`BigBasket: Found ${products.length} products for "${searchTerm}"`);

        if (products.length === 0 && process.env.USE_MOCK_DATA === 'true') {
            return getMockBigBasketData(searchTerm);
        }

        return products;

    } catch (error) {
        console.error('BigBasket scraping error:', error.message);

        if (process.env.USE_MOCK_DATA === 'true') {
            return getMockBigBasketData(searchTerm);
        }

        return [];
    }
}

function getMockBigBasketData(searchTerm) {
    const isVegetable = /tomato|potato|onion|carrot|cabbage|vegetable|fruit|apple|banana|orange/i.test(searchTerm);
    const basePrice = isVegetable ? Math.floor(Math.random() * 100) + 20 : Math.floor(Math.random() * 500) + 50;
    const capitalizedTerm = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);

    return [
        {
            platform: 'BigBasket',
            title: `${capitalizedTerm} - Fresh ${isVegetable ? '(1 kg)' : 'Pack'}`,
            price: basePrice,
            link: `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹',
            category: isVegetable ? 'Fresh Produce' : 'Groceries'
        },
        {
            platform: 'BigBasket',
            title: `${capitalizedTerm} - Premium Quality ${isVegetable ? '(500g)' : ''}`,
            price: Math.round(basePrice * 0.6),
            link: `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹',
            category: isVegetable ? 'Fresh Produce' : 'Groceries'
        }
    ];
}
