-- Community Board tables

CREATE TYPE ask_category_enum AS ENUM ('gardening', 'advice', 'carpool', 'tools', 'veggie_swap', 'referral');
CREATE TYPE ask_status_enum   AS ENUM ('open', 'closed');

CREATE TABLE community_shoutouts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        text        NOT NULL CHECK (char_length(body) <= 140),
  heart_count int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shoutout_hearts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shoutout_id uuid        NOT NULL REFERENCES community_shoutouts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shoutout_id, user_id)
);

CREATE TABLE community_asks (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category        ask_category_enum NOT NULL,
  title           text              NOT NULL,
  body            text              NOT NULL CHECK (char_length(body) <= 140),
  supported_count int               NOT NULL DEFAULT 0,
  status          ask_status_enum   NOT NULL DEFAULT 'open',
  created_at      timestamptz       NOT NULL DEFAULT now()
);

CREATE TABLE ask_supporters (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ask_id     uuid        NOT NULL REFERENCES community_asks(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ask_id, user_id)
);

-- RLS (API uses service_role key for all access)
ALTER TABLE community_shoutouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoutout_hearts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_asks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_supporters      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_community_shoutouts" ON community_shoutouts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_shoutout_hearts"     ON shoutout_hearts     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_community_asks"      ON community_asks      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_ask_supporters"      ON ask_supporters      FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Email templates for community ask connections
INSERT INTO email_templates (key, name, description, subject, body_html, variables) VALUES
(
  'community_ask_poster',
  'Community Ask — Helper notification (to poster)',
  'Sent to the ask poster when a member offers to help',
  'Someone wants to help with your Ask 🌿',
  '<h2 style="color:#3B2F2F;font-size:22px;margin:0 0 16px">Someone wants to help 🌿</h2>
<p>Hi {{poster_name}},</p>
<p><strong>{{helper_name}}</strong> saw your Ask &ldquo;<em>{{ask_title}}</em>&rdquo; and wants to help.</p>
<p>Reach out directly: <a href="mailto:{{helper_email}}" style="color:#C4845A">{{helper_email}}</a></p>
<div style="margin:24px 0;padding:16px;border-left:3px solid #6B7C5C;color:#6B7C5C;font-size:14px">
  A Hammock Earth member can help you. Every act of kindness strengthens our roots.
</div>
<p>With warmth,<br>The Hammock Earth Community</p>',
  '["poster_name","helper_name","ask_title","helper_email"]'
),
(
  'community_ask_helper',
  'Community Ask — Thank you confirmation (to helper)',
  'Sent to the member who offered to help',
  'Thank you for offering to help 🌿',
  '<h2 style="color:#3B2F2F;font-size:22px;margin:0 0 16px">Thank you for offering to help 🌿</h2>
<p>You offered to help <strong>{{poster_name}}</strong> with their Ask: &ldquo;<em>{{ask_title}}</em>&rdquo;.</p>
<p>Here&rsquo;s how to reach them: <a href="mailto:{{poster_email}}" style="color:#C4845A">{{poster_email}}</a></p>
<div style="margin:24px 0;padding:16px;border-left:3px solid #6B7C5C;color:#6B7C5C;font-size:14px">
  Every small act of kindness strengthens our roots. Thank you for making Hammock Earth a warmer place.
</div>
<p>With warmth,<br>The Hammock Earth Community</p>',
  '["poster_name","poster_email","ask_title"]'
)
ON CONFLICT (key) DO NOTHING;
