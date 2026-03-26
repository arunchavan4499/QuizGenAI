import json
import re

def safe_json_parse(text):
    """Safely parse JSON from text, attempting to extract JSON if embedded in text."""
    try:
        # First, try direct parse
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from text (look for { ... })
    try:
        # Find the first { and last }
        start = text.find('{')
        end = text.rfind('}')
        
        if start != -1 and end != -1 and end > start:
            json_str = text[start:end+1]
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON arrays
    try:
        start = text.find('[')
        end = text.rfind(']')
        
        if start != -1 and end != -1 and end > start:
            json_str = text[start:end+1]
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass
    
    # Return error
    return {"error": "Invalid JSON", "raw": text}