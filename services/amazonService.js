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
    const basePrice = Math.floor(Math.random() * 40000) + 10000;
    const capitalizedTerm = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);

    return [
        {
            platform: 'Amazon',
            title: `${capitalizedTerm} - Premium Quality Edition`,
            price: basePrice,
            link: `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹'
        },
        {
            platform: 'Amazon',
            title: `${capitalizedTerm} - Best Seller 2024`,
            price: basePrice + 2000,
            link: `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`,
            image: null,
            currency: '₹'
        }
    ];
}
