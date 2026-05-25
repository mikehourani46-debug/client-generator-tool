from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adimage import AdImage
import json

from config.settings import FB_AD_ACCOUNT_ID, METRO_DETROIT_TARGETING
from utils.logger import get_logger

log = get_logger(__name__)


class CampaignManager:
    def __init__(self):
        self.account = AdAccount(FB_AD_ACCOUNT_ID)

    # ------------------------------------------------------------------
    # Campaign
    # ------------------------------------------------------------------

    def create_campaign(self, name: str, objective: str = "OUTCOME_LEADS", status: str = "PAUSED") -> Campaign:
        """
        Create a top-level campaign.

        objective options: OUTCOME_LEADS, OUTCOME_TRAFFIC, OUTCOME_AWARENESS,
                           OUTCOME_SALES, OUTCOME_ENGAGEMENT
        status: PAUSED (safe default) or ACTIVE
        """
        params = {
            Campaign.Field.name: name,
            Campaign.Field.objective: objective,
            Campaign.Field.status: status,
            Campaign.Field.special_ad_categories: [],
        }
        campaign = self.account.create_campaign(params=params)
        log.info(f"Campaign created  id={campaign['id']}  name='{name}'  objective={objective}")
        return campaign

    # ------------------------------------------------------------------
    # Ad Set
    # ------------------------------------------------------------------

    def create_ad_set(
        self,
        campaign_id: str,
        name: str,
        daily_budget_cents: int = 2000,   # $20.00
        optimization_goal: str = "LEAD_GENERATION",
        billing_event: str = "IMPRESSIONS",
        targeting: dict | None = None,
        start_time: str | None = None,
        end_time: str | None = None,
        status: str = "PAUSED",
    ) -> AdSet:
        """
        Create an ad set under a campaign.

        daily_budget_cents: budget in account currency minor units (cents for USD).
        targeting: Facebook targeting spec dict; defaults to Metro Detroit placeholder.
        """
        targeting = targeting or METRO_DETROIT_TARGETING

        params = {
            AdSet.Field.name: name,
            AdSet.Field.campaign_id: campaign_id,
            AdSet.Field.daily_budget: daily_budget_cents,
            AdSet.Field.optimization_goal: optimization_goal,
            AdSet.Field.billing_event: billing_event,
            AdSet.Field.targeting: targeting,
            AdSet.Field.status: status,
        }
        if start_time:
            params[AdSet.Field.start_time] = start_time
        if end_time:
            params[AdSet.Field.end_time] = end_time

        ad_set = self.account.create_ad_set(params=params)
        log.info(f"Ad set created    id={ad_set['id']}  name='{name}'  budget=${daily_budget_cents/100:.2f}/day")
        return ad_set

    # ------------------------------------------------------------------
    # Creative
    # ------------------------------------------------------------------

    def create_ad_creative(
        self,
        name: str,
        page_id: str,
        headline: str,
        body: str,
        description: str = "",
        link_url: str = "https://example.com",
        image_url: str | None = None,
        call_to_action: str = "LEARN_MORE",
    ) -> AdCreative:
        """
        Create a link-ad creative (single image / no image fallback).

        call_to_action options: LEARN_MORE, SIGN_UP, CONTACT_US, GET_QUOTE, BOOK_NOW
        """
        link_data: dict = {
            "message": body,
            "link": link_url,
            "name": headline,
            "call_to_action": {
                "type": call_to_action,
                "value": {"link": link_url},
            },
        }
        if description:
            link_data["description"] = description
        if image_url:
            link_data["picture"] = image_url

        creative_params = {
            AdCreative.Field.name: name,
            AdCreative.Field.object_story_spec: {
                "page_id": page_id,
                "link_data": link_data,
            },
        }

        creative = self.account.create_ad_creative(params=creative_params)
        log.info(f"Creative created  id={creative['id']}  name='{name}'")
        return creative

    # ------------------------------------------------------------------
    # Ad
    # ------------------------------------------------------------------

    def create_ad(
        self,
        ad_set_id: str,
        creative_id: str,
        name: str,
        status: str = "PAUSED",
    ) -> Ad:
        """Attach a creative to an ad set, creating an ad."""
        params = {
            Ad.Field.name: name,
            Ad.Field.adset_id: ad_set_id,
            Ad.Field.creative: {"creative_id": creative_id},
            Ad.Field.status: status,
        }
        ad = self.account.create_ad(params=params)
        log.info(f"Ad created        id={ad['id']}  name='{name}'")
        return ad

    # ------------------------------------------------------------------
    # Convenience: full-funnel launcher
    # ------------------------------------------------------------------

    def launch_campaign(self, spec: dict) -> dict:
        """
        Build an entire campaign from a single spec dict.

        spec keys:
          campaign_name, campaign_objective, page_id,
          ad_set_name, daily_budget_cents,
          headline, body, description, link_url, image_url,
          call_to_action, status (default PAUSED)

        Returns dict with created resource IDs.
        """
        status = spec.get("status", "PAUSED")

        campaign = self.create_campaign(
            name=spec["campaign_name"],
            objective=spec.get("campaign_objective", "OUTCOME_LEADS"),
            status=status,
        )

        ad_set = self.create_ad_set(
            campaign_id=campaign["id"],
            name=spec.get("ad_set_name", f"{spec['campaign_name']} — Ad Set 1"),
            daily_budget_cents=spec.get("daily_budget_cents", 2000),
            targeting=spec.get("targeting", METRO_DETROIT_TARGETING),
            status=status,
        )

        creative = self.create_ad_creative(
            name=f"{spec['campaign_name']} — Creative",
            page_id=spec["page_id"],
            headline=spec["headline"],
            body=spec["body"],
            description=spec.get("description", ""),
            link_url=spec.get("link_url", "https://example.com"),
            image_url=spec.get("image_url"),
            call_to_action=spec.get("call_to_action", "LEARN_MORE"),
        )

        ad = self.create_ad(
            ad_set_id=ad_set["id"],
            creative_id=creative["id"],
            name=f"{spec['campaign_name']} — Ad 1",
            status=status,
        )

        result = {
            "campaign_id": campaign["id"],
            "ad_set_id": ad_set["id"],
            "creative_id": creative["id"],
            "ad_id": ad["id"],
        }
        log.info(f"Full campaign launched: {json.dumps(result, indent=2)}")
        return result
