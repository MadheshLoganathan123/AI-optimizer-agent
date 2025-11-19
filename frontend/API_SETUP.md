# API Key Setup Guide

## Quick Setup

1. **Get your OpenCage API Key**:
   - Visit: https://opencagedata.com/api
   - Sign up for a free account (2,500 requests/day)
   - Copy your API key

2. **Set your API Key** (Choose one method):

### Method 1: Via Browser UI (Easiest)
- Open the application in your browser
- If API key is not configured, a prompt will appear at the top
- Enter your API key and click "Save & Reload"
- The key will be stored in localStorage

### Method 2: Via Browser Console
```javascript
localStorage.setItem('OPENCAGE_API_KEY', 'your-actual-api-key-here');
window.location.reload();
```

### Method 3: Edit config.js
- Open `frontend/config.js`
- Replace `'YOUR_KEY'` with your actual API key
- Note: This method is NOT recommended for production as the key will be visible in source code

### Method 4: Via HTML Script Tag
Add this to `index.html` before `config.js`:
```html
<script>
    window.OPENCAGE_API_KEY = 'your-actual-api-key-here';
</script>
```

## Verification

After setting your API key:

1. Open browser console (F12)
2. Look for: `✅ OpenCage API Key loaded: abc1234567...`
3. Try searching for "Chennai" or "New York"
4. Check console logs for detailed geocoding information

## Testing Locations

The geocoding function has been tested with:
- ✅ Chennai
- ✅ Mumbai
- ✅ New York
- ✅ Tokyo
- ✅ Berlin
- ✅ London
- ✅ Delhi

## Troubleshooting

### "I could not find the location" Error

**Check Console Logs** - The geocoding function logs detailed information:

1. **API Key Issues**:
   ```
   ❌ OpenCage API Key is not configured!
   ```
   Solution: Set your API key using one of the methods above

2. **Invalid API Key**:
   ```
   ❌ [GEOCODE] OpenCage API Error Code: 401
   🔑 [GEOCODE] Authentication failed! Check your API key.
   ```
   Solution: Verify your API key is correct at https://opencagedata.com/dashboard

3. **Quota Exceeded**:
   ```
   ❌ [GEOCODE] OpenCage API Error Code: 402
   💳 [GEOCODE] Quota exceeded! Check your API usage.
   ```
   Solution: Check your usage at https://opencagedata.com/dashboard

4. **Rate Limiting**:
   ```
   ❌ [GEOCODE] OpenCage API Error Code: 429
   ⏱️ [GEOCODE] Rate limit exceeded! Slow down your requests.
   ```
   Solution: Wait a few seconds before trying again

5. **No Results Found**:
   ```
   ⚠️ [GEOCODE] No results found for query: "xyz"
   ```
   Solution: Try a more specific location name or check spelling

### Debug Information

The geocoding function logs:
- 🔍 Query being searched
- 📡 Exact URL being called
- 🔑 API key (first 10 characters)
- 📥 Full API response JSON
- ✅ Success with coordinates
- ❌ Detailed error messages

### Common Issues

1. **CORS Errors**: OpenCage API supports CORS, so this shouldn't be an issue
2. **Network Errors**: Check your internet connection
3. **Invalid Coordinates**: The function validates coordinates before returning
4. **Map Not Updating**: Check if map is initialized and coordinates are valid

## API Key Security

⚠️ **Important**: 
- Never commit API keys to version control
- Use environment variables or secure backend endpoints in production
- For development, localStorage is acceptable
- The free tier allows 2,500 requests/day

## Support

- OpenCage API Docs: https://opencagedata.com/api
- OpenCage Dashboard: https://opencagedata.com/dashboard
- Check console logs for detailed debugging information

