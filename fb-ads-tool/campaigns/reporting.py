"""Basic read-only helpers: list campaigns, fetch spend/impressions."""

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adsinsights import AdsInsights

from config.settings import FB_AD_ACCOUNT_ID
from utils.logger import get_logger

log = get_logger(__name__)


def list_campaigns(limit: int = 20) -> list[dict]:
    account = AdAccount(FB_AD_ACCOUNT_ID)
    fields = [
        Campaign.Field.id,
        Campaign.Field.name,
        Campaign.Field.objective,
        Campaign.Field.status,
        Campaign.Field.created_time,
    ]
    campaigns = account.get_campaigns(fields=fields, params={"limit": limit})
    rows = [dict(c) for c in campaigns]
    log.info(f"Found {len(rows)} campaign(s)")
    return rows


def get_campaign_insights(campaign_id: str, date_preset: str = "last_7d") -> dict:
    """
    Fetch spend, impressions, clicks, and CPM for a campaign.
    date_preset options: today, yesterday, last_7d, last_30d, this_month
    """
    campaign = Campaign(campaign_id)
    fields = [
        AdsInsights.Field.spend,
        AdsInsights.Field.impressions,
        AdsInsights.Field.clicks,
        AdsInsights.Field.cpm,
        AdsInsights.Field.cpc,
        AdsInsights.Field.ctr,
    ]
    params = {"date_preset": date_preset}
    insights = campaign.get_insights(fields=fields, params=params)
    if insights:
        return dict(insights[0])
    return {}
