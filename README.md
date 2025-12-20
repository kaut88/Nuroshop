# NeuroShop Backend API

AI-powered price comparison backend for NeuroShop platform.

## Features

- **AI-Powered Search**: Uses Groq LLM (Llama 3.3 70B) for intelligent query parsing
- **Multi-Platform Support**: Compares prices across Amazon, Flipkart, BigBasket, and JioMart
- **Smart Category Detection**: Automatically selects appropriate platforms based on product category
- **Real-Time Data**: Web scraping for live price information
- **Price Analysis**: Comprehensive price categorization and insights
- **CORS Enabled**: Configured to allow all frontend origins

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **AI**: Groq API (Llama 3.3 70B)
- **Web Scraping**: Axios + Cheerio
- **Environment**: dotenv

## API Endpoints

### POST /api/search
Search for products across multiple platforms.

**Request Body:**
```json
{
  "query": "iPhone 15 Pro"
}
```

**Response:**
```json
{
  "query": "iPhone 15 Pro",
  "searchTerm": "iPhone 15 Pro",
  "category": "electronics",
  "results": [...],
  "count": 5,
  "productInfo": {...},
  "priceAnalysis": {...},
  "platforms": ["Amazon", "Flipkart"]
}
```

### GET /health
Health check endpoint.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file:
   ```env
   PORT=5000
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

## Environment Variables

### Required for Production

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GROQ_API_KEY` | Groq API key for AI features | **Yes** | `gsk_xxx...` |
| `NODE_ENV` | Environment mode | **Yes** | `production` |
| `PORT` | Server port | No | `5000` (auto-set by platforms) |
| `USE_MOCK_DATA` | Use mock data instead of scraping | No | `true` |
| `OPENAI_API_KEY` | Fallback OpenAI API key | No | `sk-xxx...` |

### Getting API Keys

1. **Groq API Key** (Required): Get from [Groq Console](https://console.groq.com/keys)
2. **OpenAI API Key** (Optional): Get from [OpenAI Platform](https://platform.openai.com/api-keys)

See `DEPLOYMENT.md` for detailed deployment instructions.

## Project Structure

```
backend/
├── controllers/
│   └── searchController.js    # Main search logic
├── routes/
│   └── searchRoutes.js       # API routes
├── services/
│   ├── llmService.js         # AI/LLM integration
│   ├── amazonService.js      # Amazon scraping
│   ├── flipkartService.js    # Flipkart scraping
│   ├── bigbasketService.js   # BigBasket scraping
│   └── jiomartService.js     # JioMart scraping
├── utils/
│   ├── priceAnalyzer.js      # Price analysis utilities
│   └── priceComparison.js    # Price comparison logic
├── package.json
├── server.js                 # Main server file
└── .env                      # Environment variables
```

## CORS Configuration

The server is configured to allow all origins with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization`
- `Access-Control-Allow-Credentials: true`

## License

© 2025 NeuroShop. AI-powered price comparison platform.