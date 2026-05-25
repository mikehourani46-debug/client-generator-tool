#!/usr/bin/env python3
"""
Facebook Ads Manager — Campaign Launcher
=========================================
Usage:
    python launch_campaign.py                         # runs the Metro Detroit demo spec
    python launch_campaign.py --spec my_spec.json     # run a custom JSON spec file
    python launch_campaign.py --dry-run               # validate config without hitting the API
"""

import argparse
import json
import sys

from facebook_business.api import FacebookAdsApi

from config.settings import (
    FB_ACCESS_TOKEN,
    FB_AD_ACCOUNT_ID,
    FB_APP_ID,
    FB_APP_SECRET,
    METRO_DETROIT_TARGETING,
    validate_config,
)
from campaigns.campaign_manager import CampaignManager
from utils.logger import get_logger

log = get_logger("launcher")

# ---------------------------------------------------------------------------
# Demo spec — Metro Detroit local business lead-gen campaign
# Replace page_id and link_url before going ACTIVE.
# ---------------------------------------------------------------------------
DEMO_SPEC = {
    "campaign_name": "Metro Detroit Local Business — Lead Gen",
    "campaign_objective": "OUTCOME_LEADS",
    # Replace with your Facebook Page ID
    "page_id": "YOUR_PAGE_ID",
    "ad_set_name": "Metro Detroit 25-65 — Leads",
    # $20 per day (in cents)
    "daily_budget_cents": 2000,
    "targeting": METRO_DETROIT_TARGETING,
    "headline": "Get More Local Customers in Metro Detroit",
    "body": (
        "We help local businesses in Detroit, Dearborn, Warren, and surrounding "
        "communities grow their customer base — without the guesswork. "
        "Get a free quote today."
    ),
    "description": "Serving Metro Detroit since 2020.",
    # Replace with your actual landing page
    "link_url": "https://your-website.com/contact",
    # Optional: set to a direct image URL or remove the key
    # "image_url": "https://your-cdn.com/ad-image.jpg",
    "call_to_action": "GET_QUOTE",
    # Keep PAUSED until you've reviewed everything in Ads Manager
    "status": "PAUSED",
}


def parse_args():
    parser = argparse.ArgumentParser(description="Launch Facebook Ads campaign")
    parser.add_argument("--spec", help="Path to a JSON campaign spec file")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate credentials and print the spec without calling the API",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # Config validation
    try:
        validate_config()
    except EnvironmentError as e:
        log.error(str(e))
        sys.exit(1)

    # Load spec
    if args.spec:
        with open(args.spec) as f:
            spec = json.load(f)
        log.info(f"Loaded spec from {args.spec}")
    else:
        spec = DEMO_SPEC
        log.info("Using built-in Metro Detroit demo spec")

    if args.dry_run:
        log.info("DRY RUN — spec that would be submitted:")
        print(json.dumps(spec, indent=2))
        log.info(f"Ad account: {FB_AD_ACCOUNT_ID}")
        log.info("Config OK. Re-run without --dry-run to create the campaign.")
        return

    # Init FB SDK
    FacebookAdsApi.init(
        app_id=FB_APP_ID or None,
        app_secret=FB_APP_SECRET or None,
        access_token=FB_ACCESS_TOKEN,
        api_version="v21.0",
    )

    manager = CampaignManager()

    try:
        result = manager.launch_campaign(spec)
    except Exception as e:
        log.error(f"Campaign creation failed: {e}")
        sys.exit(1)

    print("\n=== Campaign Created Successfully ===")
    print(json.dumps(result, indent=2))
    print("\nAll objects created in PAUSED status.")
    print("Review in Facebook Ads Manager, then set status to ACTIVE when ready.")


if __name__ == "__main__":
    main()
