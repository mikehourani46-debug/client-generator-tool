import os
from dotenv import load_dotenv

load_dotenv()

FB_ACCESS_TOKEN = os.getenv("FB_ACCESS_TOKEN")
FB_AD_ACCOUNT_ID = os.getenv("FB_AD_ACCOUNT_ID")
FB_APP_ID = os.getenv("FB_APP_ID", "")
FB_APP_SECRET = os.getenv("FB_APP_SECRET", "")
FB_API_VERSION = os.getenv("FB_API_VERSION", "v21.0")

# Metro Detroit targeting — covers Detroit, Dearborn, Warren, Livonia, Sterling Heights, etc.
METRO_DETROIT_TARGETING = {
    "geo_locations": {
        "cities": [
            {"key": "2421836", "name": "Detroit", "region": "Michigan", "country": "US", "radius": 25, "distance_unit": "mile"},
        ],
        "location_types": ["home", "recent"],
    },
    "age_min": 25,
    "age_max": 65,
    "locales": [6],  # English
}

def validate_config():
    missing = []
    if not FB_ACCESS_TOKEN:
        missing.append("FB_ACCESS_TOKEN")
    if not FB_AD_ACCOUNT_ID:
        missing.append("FB_AD_ACCOUNT_ID")
    if missing:
        raise EnvironmentError(
            f"Missing required env vars: {', '.join(missing)}\n"
            "Copy .env.example to .env and fill in your credentials."
        )
