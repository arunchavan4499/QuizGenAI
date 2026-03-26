# NVIDIA API Setup Guide

## Problem
You're getting a 401 Unauthorized error when the backend tries to use the LLM service. This means the NVIDIA API key is missing or invalid.

## Solution

### Step 1: Get Your NVIDIA API Key
1. Go to [NVIDIA Build](https://build.nvidia.com/)
2. Sign in or create an account
3. Navigate to the API Keys section
4. Generate a new API key
5. Copy the key (you'll only see it once)

### Step 2: Set Up Environment Variable

#### Option A: Use .env File (Recommended)
1. Open or create `.env` in the project root (`hire4thon/.env`)
2. Add your API key:
   ```
   NVIDIA_API_KEY=nvapi_xxxxxxxxxxxxxxxxxxxx
   ```
3. Make sure this file is in `.gitignore` (it already is) so you don't accidentally commit it

#### Option B: Export Environment Variable
For Windows PowerShell:
```powershell
$env:NVIDIA_API_KEY="nvapi_xxxxxxxxxxxxxxxxxxxx"
```

For Linux/Mac Bash:
```bash
export NVIDIA_API_KEY="nvapi_xxxxxxxxxxxxxxxxxxxx"
```

### Step 3: Test the Setup

Run the LLM provider test:
```bash
cd llm_service/providers
python llm_provider.py
```

You should see:
```
Loaded .env from: ...
==================================================
Test 1: Instantiate LLMProvider and verify API key
==================================================
✓ API key loaded successfully
  API Key (first 20 chars): nvapi_xxxxxxxxxxxx...
```

### Step 4: Restart Backend

Stop and restart the backend server:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

Try a quiz request again. It should now work without the 401 error.

## Troubleshooting

### Still Getting 401 Error?
1. **Check if API key is valid**: Test directly with curl
   ```bash
   curl -X POST https://integrate.api.nvidia.com/v1/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"qwen/qwen3.5-397b-a17b","messages":[{"role":"user","content":"hello"}]}'
   ```

2. **Check if .env is loaded**: The LLM provider prints a message when it loads the .env file
   - Look for: `Loaded .env from: ...`
   - If you don't see this, the file wasn't found

3. **Verify API key format**: Should start with `nvapi_`

4. **Check permissions**: Make sure you're using an API key that has access to the model API

### Using Mock Data
If you can't get the API key working, the system will automatically fall back to mock data. You'll see messages like:
```
Error: NVIDIA API authentication failed (401). Please verify your NVIDIA_API_KEY is valid.
Using mock data instead.
```

This allows you to continue testing the backend without real LLM responses.

## API Key Security
- Never commit `.env` files to git
- Never share your API key with others
- Rotate your key if you suspect it's been compromised
- Use different keys for development, testing, and production

## File Locations
- Project root `.env`: `hire4thon/.env`
- LLM service accepts `.env` at multiple locations:
  - Root: `hire4thon/.env`
  - LLM service: `hire4thon/llm_service/.env`
  - Current working directory: wherever you run from
