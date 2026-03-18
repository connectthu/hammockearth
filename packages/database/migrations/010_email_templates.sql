CREATE TABLE email_templates (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  subject     TEXT NOT NULL,
  body_html   TEXT NOT NULL,
  variables   JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_settings (
  key              TEXT PRIMARY KEY,
  label            TEXT NOT NULL,
  description      TEXT,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE email_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmins via service role key (API uses service role); no public/anon access needed
CREATE POLICY "Service role only" ON email_templates      FOR ALL USING (false);
CREATE POLICY "Service role only" ON notification_settings FOR ALL USING (false);

-- Seed email templates (branded, logo at top, full inline-CSS layout)
-- Logo served from https://hammock.earth/logo-email.png (public CDN)
-- wrapEmailBody() in EmailService wraps body_html in the outer shell div

INSERT INTO email_templates (key, name, description, subject, body_html, variables) VALUES
(
  'booking_confirmation',
  'Event Booking Confirmation',
  'Sent to guests after a successful event registration',
  'You''re registered — {{event_title}}',
  '<!-- LOGO -->
<div style="text-align:center;padding:32px 0 24px">
  <img src="https://hammock.earth/logo-email.png" alt="Hammock Earth" style="height:48px;width:auto" />
</div>
<!-- DIVIDER -->
<div style="border-top:1px solid #F5EFE6;margin-bottom:32px"></div>

<h1 style="font-size:26px;color:#3B2F2F;margin:0 0 16px">You''re registered 🌿</h1>
<p style="margin:0 0 12px">Hi {{name}},</p>
<p style="margin:0 0 24px">We''re so glad you''re joining us. Here are your booking details:</p>

<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
  <tr>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6;font-weight:bold;width:38%">Event</td>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6">{{event_title}}</td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6;font-weight:bold">Date</td>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6">{{event_date}}</td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6;font-weight:bold">Time</td>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6">{{event_time}}</td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6;font-weight:bold">Location</td>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6">{{event_location}}</td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6;font-weight:bold">Tickets</td>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6">{{quantity}}</td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6;border-bottom:1px solid #F5EFE6;font-weight:bold">Total Paid</td>
    <td style="padding:10px 0;border-top:1px solid #F5EFE6;border-bottom:1px solid #F5EFE6">{{amount_paid}}</td>
  </tr>
</table>

<p style="margin:0 0 24px">The .ics file is attached — open it to add the event to your calendar.</p>
{{confirmation_details_block}}
<p style="margin:24px 0 8px">If you have any questions, reply to this email or reach us at <a href="mailto:hello@hammock.earth" style="color:#C4845A">hello@hammock.earth</a>.</p>
<p style="margin:0">With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>

<!-- FOOTER -->
<div style="border-top:1px solid #F5EFE6;margin-top:40px;padding-top:20px;text-align:center">
  <p style="font-size:12px;color:#9E9089;margin:0">© Hammock Earth · Hillsdale, Ontario · <a href="https://hammock.earth" style="color:#9E9089">hammock.earth</a></p>
</div>',
  '["name","event_title","event_date","event_time","event_location","quantity","amount_paid","confirmation_details_block"]'
),
(
  'membership_welcome_season_pass',
  'Membership Welcome — Season Pass',
  'Sent after a Season Pass or Try-a-Month membership activates',
  'Welcome to Hammock Earth 🌿',
  '<!-- LOGO -->
<div style="text-align:center;padding:32px 0 24px">
  <img src="https://hammock.earth/logo-email.png" alt="Hammock Earth" style="height:48px;width:auto" />
</div>
<div style="border-top:1px solid #F5EFE6;margin-bottom:32px"></div>

<h1 style="font-size:26px;color:#3B2F2F;margin:0 0 16px">Welcome to the community 🌿</h1>
<p style="margin:0 0 12px">Hi {{name}},</p>
<p style="margin:0 0 24px">Your Season Pass is now active. We''re so glad you''re here.</p>

<h2 style="font-size:16px;color:#3B2F2F;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">What''s included</h2>
<ul style="padding-left:20px;line-height:2;color:#3B2F2F;margin:0 0 24px">
  <li>2 tickets per event at member price</li>
  <li>Members-only events &amp; farm days</li>
  <li>Weekly farm days at Hammock Hills</li>
  <li>Care Tent visit</li>
  <li>Farming &amp; homesteading workshops</li>
  <li>Movement, meditation &amp; nature art</li>
  <li>Online Community Circles</li>
  <li>Full content library access</li>
  <li>Newsletter &amp; a seasonal gift</li>
</ul>

{{validity_html}}

<p style="margin:0 0 24px">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#C4845A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold;font-size:15px">Go to your dashboard →</a>
</p>

<p style="margin:0">With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>

<div style="border-top:1px solid #F5EFE6;margin-top:40px;padding-top:20px;text-align:center">
  <p style="font-size:12px;color:#9E9089;margin:0">© Hammock Earth · Hillsdale, Ontario · <a href="https://hammock.earth" style="color:#9E9089">hammock.earth</a></p>
</div>',
  '["name","validity_html","dashboard_url"]'
),
(
  'membership_welcome_farm_friend',
  'Membership Welcome — Farm Friend',
  'Sent after a Farm Friend membership activates',
  'Welcome to Hammock Earth 🌿',
  '<!-- LOGO -->
<div style="text-align:center;padding:32px 0 24px">
  <img src="https://hammock.earth/logo-email.png" alt="Hammock Earth" style="height:48px;width:auto" />
</div>
<div style="border-top:1px solid #F5EFE6;margin-bottom:32px"></div>

<h1 style="font-size:26px;color:#3B2F2F;margin:0 0 16px">Welcome to the community 🌿</h1>
<p style="margin:0 0 12px">Hi {{name}},</p>
<p style="margin:0 0 24px">Your Farm Friend membership is now active. We''re glad you''re part of Hammock Earth.</p>

<h2 style="font-size:16px;color:#3B2F2F;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">What''s included</h2>
<ul style="padding-left:20px;line-height:2;color:#3B2F2F;margin:0 0 24px">
  <li>Access to our growing content library</li>
  <li>Recipes &amp; homesteading guides</li>
  <li>Monthly newsletter</li>
</ul>

<p style="margin:0 0 24px">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#C4845A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold;font-size:15px">Go to your dashboard →</a>
</p>

<p style="margin:0">With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>

<div style="border-top:1px solid #F5EFE6;margin-top:40px;padding-top:20px;text-align:center">
  <p style="font-size:12px;color:#9E9089;margin:0">© Hammock Earth · Hillsdale, Ontario · <a href="https://hammock.earth" style="color:#9E9089">hammock.earth</a></p>
</div>',
  '["name","dashboard_url"]'
);

-- Seed notification settings
INSERT INTO notification_settings (key, label, description, enabled, recipient_emails) VALUES
('new_registration',    'New Registration',   'Someone registers for an event',                true,  ARRAY['hello@hammock.earth']),
('new_membership',      'New Membership',      'Someone purchases a membership',               true,  ARRAY['hello@hammock.earth']),
('cancellation',        'Cancellation',        'Registration or membership cancelled',         true,  ARRAY['hello@hammock.earth']),
('facilitator_inquiry', 'Facilitator Inquiry', 'Someone submits the facilitator/space inquiry', true,  ARRAY['hello@hammock.earth']),
('waitlist_signup',     'Waitlist Signup',     'Someone joins the general waitlist',           false, ARRAY['hello@hammock.earth']);
