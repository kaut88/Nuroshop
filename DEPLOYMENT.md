# NeuroShop Backend - Production Deployment Guide

## Required Environment Variables

### ✅ **MANDATORY Variables**

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `GROQ_API_KEY` | Groq API key for AI features | `gsk_xxx...` | [Groq Console](https://console.groq.com/keys) |
| `NODE_ENV` | Environment mode | `production` | Set manually |

### 🔧 **OPTIONAL Variables**

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `PORT` | Server port | `5000` | Usually auto-set by hosting platforms |
| `USE_MOCK_DATA` | Use mock data instead of scraping | `true` | Set to `false` for real scraping |
| `OPENAI_API_KEY` | Fallback OpenAI API key | - | Only if Groq is unavailable |

## Platform-Specific Deployment

### 🚀 **Railway**
```bash
# Set environment variables in Railway dashboard
GROQ_API_KEY=your_key_here
NODE_ENV=production
USE_MOCK_DATA=true
```

### 🎯 **Render**
```bash
# Set in Render environment variables
GROQ_API_KEY=your_key_here
NODE_ENV=production
USE_MOCK_DATA=true
```

### 🔷 **Heroku**
```bash
heroku config:set GROQ_API_KEY=your_key_here
heroku config:set NODE_ENV=production
heroku config:set USE_MOCK_DATA=true
```

### ⚡ **Vercel**
```bash
# vercel.json configuration needed for serverless
# Set in Vercel dashboard environment variables
GROQ_API_KEY=your_key_here
NODE_ENV=production
USE_MOCK_DATA=true
```

### 🌊 **DigitalOcean App Platform**
```yaml
# .do/app.yaml
envs:
- key: GROQ_API_KEY
  value: your_key_here
- key: NODE_ENV
  value: production
- key: USE_MOCK_DATA
  value: "true"
```

## Getting API Keys

### Groq API Key (Required)
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up/Login
3. Go to API Keys section
4. Create new API key
5. Copy the key (starts with `gsk_`)

### OpenAI API Key (Optional Fallback)
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up/Login
3. Go to API Keys
4. Create new secret key
5. Copy the key (starts with `sk-`)

## Deployment Commands

### Standard Node.js Deployment
```bash
# Install dependencies
npm install

# Start production server
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Build Commands for Platforms
```json
{
  "scripts": {
    "build": "echo 'No build step required'",
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
```

## Health Check

Your deployment should respond to:
- `GET /health` - Returns server status
- `POST /api/search` - Main search endpoint

## Security Checklist

- ✅ Set `NODE_ENV=production`
- ✅ Use HTTPS in production
- ✅ Keep API keys secure
- ✅ Enable CORS for your frontend domain
- ✅ Monitor API usage
- ✅ Set up error logging

## Troubleshooting

### Common Issues

1. **"GROQ_API_KEY not found"**
   - Ensure the environment variable is set correctly
   - Check for typos in variable name

2. **"Port already in use"**
   - Let the platform set PORT automatically
   - Don't hardcode port numbers

3. **"CORS errors"**
   - Backend is configured to allow all origins
   - Check if frontend URL is correct

4. **"Scraping blocked"**
   - Set `USE_MOCK_DATA=true`
   - Consider using official APIs instead

### Logs to Monitor
- Server startup logs
- API request/response logs
- Groq API usage
- Error logs

## Cost Optimization

- Monitor Groq API usage
- Implement request caching if needed
- Use mock data for development/testing
- Set up usage alerts

## Support

For deployment issues:
1. Check platform-specific documentation
2. Verify all required environment variables
3. Test the `/health` endpoint
4. Check server logs for errors