from fastapi import APIRouter, Depends, HTTPException, status, Header, BackgroundTasks, Request
from sqlalchemy.orm import Session
from datetime import date, timedelta
import json
import logging

import models
import schemas
import email_client
from database import get_db
from config import settings
from limiter import limiter

logger = logging.getLogger("notifications_router")

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

@router.post("/check-renewals")
@limiter.limit("10/minute")
async def check_renewals(
    request: Request,
    background_tasks: BackgroundTasks,
    x_cron_security_key: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Daily cron endpoint to check for subscriptions renewing in 1 day or 7 days,
    aggregating warnings into a single daily email digest per user.
    Only sends if user has explicitly opted-in (enable_email_renewals is True).
    """
    # Verify Cron Security Key
    if not x_cron_security_key or x_cron_security_key != settings.CRON_SECURITY_KEY:
        logger.warning("Unauthorized attempt to access check-renewals cron endpoint")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing Cron Security Key"
        )

    today = date.today()
    one_day_out = today + timedelta(days=1)
    seven_days_out = today + timedelta(days=7)

    # Query all active subscriptions renewing in exactly 1 day or 7 days
    # This acts as the trigger for sending the notification email
    triggering_subs = db.query(models.Subscription).filter(
        models.Subscription.is_active == True,
        models.Subscription.next_billing_date.in_([one_day_out, seven_days_out])
    ).all()

    if not triggering_subs:
        return {"status": "success", "message": "No subscriptions renewing in exactly 1 or 7 days found.", "emails_sent": 0}

    # Group owners to see who should receive an email today
    eligible_owners = set()
    for sub in triggering_subs:
        if sub.owner:
            eligible_owners.add(sub.owner)

    emails_queued = 0

    # Build and send consolidated daily email digest for each eligible, opted-in user
    for owner in eligible_owners:
        # Verify user preferences (must be explicitly enabled, default False)
        preferences = {}
        if owner.preferences:
            try:
                preferences = json.loads(owner.preferences)
            except Exception as e:
                logger.error(f"Error decoding preferences for user {owner.id}: {e}")

        # Check opt-in toggle (email renewals)
        enable_email_renewals = preferences.get("enable_email_renewals", False)
        if not enable_email_renewals:
            continue

        # Fetch ALL active subscriptions for this user renewing in the next 7 days (today through today+7)
        # This provides a helpful overview of the coming week's expenses alongside the urgent alerts
        seven_days_limit = today + timedelta(days=7)
        user_subs = db.query(models.Subscription).filter(
            models.Subscription.user_id == owner.id,
            models.Subscription.is_active == True,
            models.Subscription.next_billing_date >= today,
            models.Subscription.next_billing_date <= seven_days_limit
        ).order_by(models.Subscription.next_billing_date.asc()).all()

        urgent_subs = []
        upcoming_subs = []

        for sub in user_subs:
            days_remaining = (sub.next_billing_date - today).days
            if days_remaining <= 1:
                urgent_subs.append(sub)
            else:
                upcoming_subs.append(sub)

        if not urgent_subs and not upcoming_subs:
            continue

        # Choose subject line based on urgency
        if urgent_subs:
            subject = "⚠️ URGENT: Subscription Renewal Due Tomorrow - BingeSensei"
        else:
            subject = "📅 Upcoming Subscription Renewals - BingeSensei"

        # Build premium HTML template with glassmorphism/dark theme matching BingeSensei
        html_content = build_renewal_email_html(owner, urgent_subs, upcoming_subs)

        # Send via background task to avoid blocking response
        background_tasks.add_task(
            email_client.send_email,
            subject=subject,
            recipients=[owner.email],
            body=html_content
        )
        emails_queued += 1

    return {
        "status": "success",
        "message": f"Successfully processed notifications. Queued email digests for {emails_queued} users.",
        "emails_sent": emails_queued
    }


def build_renewal_email_html(user, urgent_subs, upcoming_subs):
    """
    Builds a beautifully designed, premium dark-themed HTML email layout.
    """
    total_cost = sum(s.cost for s in urgent_subs + upcoming_subs)
    
    # Select accent colors and headers
    has_urgent = len(urgent_subs) > 0
    hero_accent = "#f43f5e" if has_urgent else "#6366f1"
    hero_title = "Action Required: Renewal Due Tomorrow" if has_urgent else "Upcoming Renewals Next Week"
    hero_subtitle = "Review your active subscriptions and cancel any services you no longer use."

    # Subscriptions List HTML Builder
    subs_html = ""
    
    # Urgent Section
    if urgent_subs:
        subs_html += f"""
        <div style="margin-bottom: 24px;">
            <h3 style="color: #f43f5e; font-size: 14px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; border-bottom: 1px solid rgba(244, 63, 94, 0.2); padding-bottom: 6px;">
                ⚠️ Renewing Tomorrow
            </h3>
        """
        for sub in urgent_subs:
            formatted_cost = f"{sub.cost:.2f} {sub.currency}"
            subs_html += f"""
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td>
                            <div style="font-weight: 700; font-size: 16px; color: #ffffff;">{sub.service_name}</div>
                            <div style="font-size: 12px; color: #a1a1aa; margin-top: 4px;">Billing cycle: {sub.billing_cycle.capitalize()}</div>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                            <div style="font-weight: 800; font-size: 18px; color: #f43f5e;">{formatted_cost}</div>
                            <div style="font-size: 11px; color: #f43f5e; margin-top: 4px; font-weight: 700;">Final Call</div>
                        </td>
                    </tr>
                </table>
            </div>
            """
        subs_html += "</div>"

    # Upcoming Section
    if upcoming_subs:
        subs_html += f"""
        <div style="margin-bottom: 24px;">
            <h3 style="color: #6366f1; font-size: 14px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; border-bottom: 1px solid rgba(99, 102, 241, 0.2); padding-bottom: 6px;">
                📅 Renewing within 7 Days
            </h3>
        """
        for sub in upcoming_subs:
            formatted_cost = f"{sub.cost:.2f} {sub.currency}"
            subs_html += f"""
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td>
                            <div style="font-weight: 700; font-size: 16px; color: #ffffff;">{sub.service_name}</div>
                            <div style="font-size: 12px; color: #a1a1aa; margin-top: 4px;">Next Bill: {sub.next_billing_date.strftime('%b %d, %Y')}</div>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                            <div style="font-weight: 800; font-size: 18px; color: #ffffff;">{formatted_cost}</div>
                            <div style="font-size: 11px; color: #6366f1; margin-top: 4px; font-weight: 600;">{sub.billing_cycle.capitalize()}</div>
                        </td>
                    </tr>
                </table>
            </div>
            """
        subs_html += "</div>"

    # Full Email Layout HTML (Dark Glassmorphic Theme)
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BingeSensei Renewal Notification</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #09090b;
                color: #fafafa;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }}
            .email-container {{
                max-width: 580px;
                margin: 40px auto;
                background-color: #09090b;
                border: 1px solid #1e1e24;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            }}
            .header-banner {{
                background: linear-gradient(135deg, #09090b 0%, #18181b 100%);
                padding: 32px;
                text-align: center;
                border-bottom: 1px solid #1e1e24;
                position: relative;
            }}
            .header-accent {{
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: {hero_accent};
            }}
            .logo-text {{
                font-size: 22px;
                font-weight: 900;
                color: #ffffff;
                letter-spacing: -0.5px;
                margin: 0 0 16px 0;
            }}
            .logo-text span {{
                color: #6366f1;
            }}
            .hero-title {{
                font-size: 20px;
                font-weight: 800;
                color: #ffffff;
                margin: 0 0 8px 0;
            }}
            .hero-subtitle {{
                font-size: 14px;
                color: #a1a1aa;
                margin: 0;
                line-height: 1.5;
            }}
            .content-section {{
                padding: 32px;
            }}
            .cta-button {{
                display: block;
                background-color: {hero_accent};
                color: #ffffff !important;
                text-align: center;
                text-decoration: none;
                font-weight: 700;
                font-size: 15px;
                padding: 14px 24px;
                border-radius: 12px;
                margin-top: 24px;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
            }}
            .footer-section {{
                background-color: #09090b;
                border-top: 1px solid #1e1e24;
                padding: 24px 32px;
                text-align: center;
                font-size: 12px;
                color: #71717a;
                line-height: 1.6;
            }}
            .footer-section a {{
                color: #6366f1;
                text-decoration: none;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header-banner">
                <div class="header-accent"></div>
                <div class="logo-text">Binge<span>Sensei</span></div>
                <h1 class="hero-title">{hero_title}</h1>
                <p class="hero-subtitle">{hero_subtitle}</p>
            </div>
            
            <div class="content-section">
                {subs_html}
                
                <a href="{settings.FRONTEND_URL}/dashboard/subscriptions" class="cta-button">
                    Manage Subscriptions & Billing
                </a>
            </div>
            
            <div class="footer-section">
                You received this email because you opted in to Renewal Notifications on BingeSensei.<br>
                To stop receiving these alerts, you can update your preference anytime in your <a href="{settings.FRONTEND_URL}/profile">Profile Settings</a>.
            </div>
        </div>
    </body>
    </html>
    """
