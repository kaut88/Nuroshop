# NeuroShop API Documentation

## Base URL
```
Production: https://your-backend-url.com
Development: http://localhost:5000
```

## API Version
Current version: `v1`

All API endpoints are prefixed with `/api/v1`

## Authentication
No authentication required for current endpoints.

## Rate Limiting
- **Development**: 1000 requests per 15 minutes per IP
- **Production**: 100 requests per 15 minutes per IP

## Response Format
All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": {...},
  "metadata": {
    "timestamp": "2025-01-01T00:00:00.000Z",
    "processingTime": 1500
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Endpoints

### 1. Search Products
Search for products across multiple e-commerce platforms.

**Endpoint:** `POST /api/v1/search`

**Request Body:**
```json
{
  "query": "iPhone 15 Pro"
}
```

**Request Validation:**
- `query` (required): String, 1-200 characters
- Query will be trimmed and validated

**Response:**
```json
{
  "success": true,
  "query": "iPhone 15 Pro",
  "searchTerm": "iPhone 15 Pro",
  "category": "electronics",
  "results": [
    {
      "platform": "Amazon",
      "title": "Apple iPhone 15 Pro 128GB",
      "price": 134900,
      "link": "https://amazon.in/...",
      "image": "https://...",
      "currency": "₹",
      "rank": 1,
      "isCheapest": true,
      "savingsAmount": 0,
      "savingsPercentage": 0
    }
  ],
  "count": 5,
  "productInfo": {
    "productName": "Apple iPhone 15 Pro",
    "category": "Electronics",
    "keyFeatures": [...],
    "description": "...",
    "priceAnalysis": "...",
    "recommendation": "...",
    "priceStats": {
      "min": 134900,
      "max": 145000,
      "average": 139500,
      "count": 5
    }
  },
  "priceAnalysis": {
    "total": 5,
    "priceStats": {...},
    "categories": {...},
    "platforms": [...],
    "summary": {...}
  },
  "platforms": ["Amazon", "Flipkart"],
  "metadata": {
    "searchedPlatforms": ["Amazon", "Flipkart"],
    "successfulPlatforms": 2,
    "processingTime": 2500,
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or missing query
- `500 Internal Server Error`: Search failed
- `429 Too Many Requests`: Rate limit exceeded

### 2. Get API Statistics
Get information about API capabilities and statistics.

**Endpoint:** `GET /api/v1/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalPlatforms": 4,
    "supportedCategories": ["electronics", "groceries", "vegetables", "food", "general"],
    "features": [
      "AI-powered query parsing",
      "Multi-platform price comparison",
      "Smart category detection",
      "Price analysis and insights"
    ]
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 3. Get API Information
Get general information about the API.

**Endpoint:** `GET /api/v1/info`

**Response:**
```json
{
  "name": "NeuroShop API",
  "version": "1.0.0",
  "description": "AI-powered price comparison API",
  "endpoints": {
    "POST /api/v1/search": "Search products across multiple platforms",
    "GET /api/v1/stats": "Get API statistics",
    "GET /api/v1/info": "Get API information",
    "GET /health": "Health check",
    "GET /health/detailed": "Detailed health check"
  },
  "documentation": "https://github.com/kaut88/Nuroshop",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 4. Health Check
Basic health check endpoint.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### 5. Detailed Health Check
Comprehensive health check with system information.

**Endpoint:** `GET /health/detailed`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600.5,
  "memory": {
    "rss": 45678592,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1234567
  },
  "services": {
    "groq": "configured",
    "mockData": "enabled"
  }
}
```

## Supported Platforms

### Electronics Platforms (Always Searched)
- **Amazon India**: amazon.in
- **Flipkart**: flipkart.com

### Grocery Platforms (Category-Based)
- **BigBasket**: bigbasket.com
- **JioMart**: jiomart.com

*Note: Grocery platforms are only searched for categories: groceries, vegetables, food*

## Categories

The API automatically detects product categories:

- **electronics**: Phones, laptops, gadgets, electronics
- **groceries**: Rice, flour, packaged foods, household items
- **vegetables**: Fresh vegetables, fruits, organic produce
- **food**: Snacks, beverages, ready-to-eat items
- **general**: Default category for unclassified items

## Features

### AI-Powered Query Processing
- Intelligent query parsing using Groq LLM (Llama 3.3 70B)
- Automatic category detection
- Clean search term extraction

### Price Analysis
- Automatic price sorting (lowest to highest)
- Savings calculation
- Price categorization (Budget, Affordable, Premium, Luxury)
- Platform distribution analysis

### Caching
- 5-minute cache for LLM responses
- Automatic cache cleanup
- Improved response times for repeated queries

### Error Handling
- Graceful fallbacks for failed services
- Detailed error logging
- Mock data support when scraping fails

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Best Practices

### Request Optimization
1. Use specific product names for better results
2. Avoid overly long queries (max 200 characters)
3. Include brand names when possible

### Error Handling
1. Always check the `success` field in responses
2. Handle rate limiting with exponential backoff
3. Implement fallback UI for failed requests

### Performance
1. Cache results on the client side when appropriate
2. Use the detailed health check to monitor API status
3. Monitor processing times in metadata

## Examples

### Search for Electronics
```bash
curl -X POST https://your-api.com/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "iPhone 15 Pro 256GB"}'
```

### Search for Groceries
```bash
curl -X POST https://your-api.com/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "organic basmati rice 5kg"}'
```

### Get API Stats
```bash
curl https://your-api.com/api/v1/stats
```

## Support

For issues and questions:
- GitHub: https://github.com/kaut88/Nuroshop
- Check `/health/detailed` for system status
- Review error messages in responses