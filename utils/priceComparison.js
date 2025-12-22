export function compareAndSort(products) {
    // Filter valid products with better validation
    const validProducts = products.filter(p => {
        const isValid = p &&
            typeof p.price === 'number' &&
            p.price > 0 &&
            p.title &&
            typeof p.title === 'string' &&
            p.title.trim().length > 0 &&
            p.link &&
            typeof p.link === 'string';

        if (!isValid && p) {
            console.warn('Invalid product filtered out:', {
                title: p.title,
                price: p.price,
                platform: p.platform
            });
        }

        return isValid;
    });

    console.log(`🔍 Filtering: ${products.length} → ${validProducts.length} valid products`);

    // Sort by price ascending (lowest first) with explicit number comparison
    validProducts.sort((a, b) => {
        const priceA = Number(a.price);
        const priceB = Number(b.price);
        return priceA - priceB;
    });

    // Log sorted prices for debugging
    console.log('📊 Sorted prices:', validProducts.map(p => `${p.platform}: ₹${p.price}`));

    // Mark cheapest (first item after sorting)
    if (validProducts.length > 0) {
        validProducts[0].isCheapest = true;
        console.log(`💰 Cheapest: ${validProducts[0].title} - ₹${validProducts[0].price}`);
    }

    // Add rank to each product
    validProducts.forEach((product, index) => {
        product.rank = index + 1;
    });

    return validProducts;
}
