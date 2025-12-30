export function compareAndSort(products) {
    // Filter valid products with better validation
    const validProducts = products.filter(p =>
        p &&
        p.price &&
        p.price > 0 &&
        p.title &&
        p.title.length > 3 &&
        p.link &&
        p.platform
    );

    // Remove duplicates based on title similarity
    const uniqueProducts = [];
    validProducts.forEach(product => {
        const isDuplicate = uniqueProducts.some(existing => {
            const similarity = calculateSimilarity(product.title.toLowerCase(), existing.title.toLowerCase());
            return similarity > 0.8 && Math.abs(product.price - existing.price) < product.price * 0.1;
        });
        
        if (!isDuplicate) {
            uniqueProducts.push(product);
        }
    });

    // Sort by price ascending (lowest first)
    uniqueProducts.sort((a, b) => a.price - b.price);

    // Mark cheapest (first item after sorting)
    if (uniqueProducts.length > 0) {
        uniqueProducts[0].isCheapest = true;
    }

    // Add rank to each product
    uniqueProducts.forEach((product, index) => {
        product.rank = index + 1;
    });

    return uniqueProducts;
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}
