export function compareAndSort(products) {
    // Filter valid products
    const validProducts = products.filter(p =>
        p.price &&
        p.price > 0 &&
        p.title &&
        p.link
    );

    // Sort by price ascending (lowest first)
    validProducts.sort((a, b) => a.price - b.price);

    // Mark cheapest (first item after sorting)
    if (validProducts.length > 0) {
        validProducts[0].isCheapest = true;
    }

    // Add rank to each product
    validProducts.forEach((product, index) => {
        product.rank = index + 1;
    });

    return validProducts;
}
