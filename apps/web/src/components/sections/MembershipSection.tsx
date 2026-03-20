import { createServerClient } from "@hammock/database";

async function getPriceWindows() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("membership_price_windows")
      .select("*")
      .order("price_cents", { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString("en-CA")}`;
}

function monthsUntilEndOf2026() {
  const end = new Date("2026-12-31");
  const now = new Date();
  const diff = Math.max(
    0,
    Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
  );
  return diff;
}

export async function MembershipSection({ checkoutLinks = false }: { checkoutLinks?: boolean } = {}) {
  const windows = await getPriceWindows();
  const months = monthsUntilEndOf2026();

  return (
    <section id="membership" className="py-24 bg-linen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="section-label mb-4">Join the Community</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-soil mb-4">
            Join Hammock Earth
          </h2>
          <p className="text-charcoal/70 max-w-2xl mx-auto">
            We have big plans for this year: more events, more collaborations,
            and more ways to gather on the land and online. Membership helps
            make it all possible. It supports the space, the offerings, and the
            people behind Hammock Earth.
          </p>
        </div>

        {/* Seasons Pass */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h3 className="font-serif text-2xl text-soil mb-2">
              🌿 2026 Seasons Pass
            </h3>
            <p className="text-sm text-moss font-medium">
              Valid through December 31, 2026 · {months} months remaining from today
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {windows.map((w) => {
              const isFounding = w.slug === "founding";
              const isEarlyBird = w.slug === "early_bird";
              const spotsLeft = isFounding
                ? (w.max_spots ?? 22) - w.spots_taken
                : null;
              const isOpen = w.status === "open";

              // Early Bird is locked until Founding sells out
              const foundingWindow = windows.find((x: any) => x.slug === "founding");
              const foundingSoldOut = foundingWindow
                ? foundingWindow.spots_taken >= (foundingWindow.max_spots ?? 22)
                : true;
              const earlyBirdLocked = isEarlyBird && !foundingSoldOut;

              return (
                <div
                  key={w.slug}
                  className={`flex flex-col rounded-2xl p-8 border ${
                    isFounding
                      ? "border-clay bg-clay/5"
                      : "border-linen bg-linen"
                  }`}
                >
                  {isFounding && spotsLeft !== null && spotsLeft > 0 && (
                    <div className="text-xs font-semibold text-clay uppercase tracking-wide mb-3">
                      {spotsLeft} founding spots remaining
                    </div>
                  )}
                  <h4 className="font-serif text-xl text-soil mb-1">
                    {w.slug === "regular" ? "Member" : w.label}
                  </h4>
                  <div className="text-3xl font-serif text-soil mb-4">
                    {formatPrice(w.price_cents)}
                  </div>
                  <p className="text-sm text-charcoal/60 mb-6 flex-1">
                    {isFounding
                      ? "For those who feel called to support from the very beginning and help shape what this becomes."
                      : isEarlyBird
                      ? "A reduced rate for joining ahead of the season and planning to be part of what unfolds."
                      : "Be part of the community throughout the season."}
                  </p>
                  {earlyBirdLocked ? (
                    <span className="mt-auto block text-center py-3 px-6 rounded-full text-sm text-charcoal/40 bg-linen border border-linen">
                      Available after Founding
                    </span>
                  ) : isOpen ? (
                    <a
                      href={
                        checkoutLinks
                          ? `/members/checkout?tier=season_pass&window=${w.slug}`
                          : "/members"
                      }
                      className={`mt-auto block text-center py-3 px-6 rounded-full font-medium text-sm transition-colors ${
                        isFounding
                          ? "bg-clay text-white hover:bg-clay/90"
                          : "bg-soil text-cream hover:bg-soil/90"
                      }`}
                    >
                      Join Now
                    </a>
                  ) : (
                    <span className="mt-auto block text-center py-3 px-6 rounded-full text-sm text-charcoal/40 bg-linen border border-linen">
                      {w.status === "sold_out" ? "Sold Out" : "Closed"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Seasons pass perks */}
          <div className="bg-linen rounded-2xl p-8 max-w-2xl mx-auto">
            <h4 className="font-serif text-lg text-soil mb-4 text-center">
              Seasons Pass Includes
            </h4>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-charcoal/80">
              {[
                "2 tickets per event at member price",
                "Members-only events & farm days",
                "Weekly farm days at Hammock Hills",
                "Care Tent visit",
                "Farming & homesteading workshops",
                "Movement, meditation & nature art",
                "Online Community Circles",
                "Full content library access",
                "Newsletter",
                "A seasonal gift",
              ].map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <span className="text-moss mt-0.5">✓</span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Farm Friend + Try a Month */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-6">
          <div className="bg-linen rounded-2xl p-8 border border-linen">
            <div className="text-2xl mb-3">🌻</div>
            <h3 className="font-serif text-xl text-soil mb-2">Farm Friend</h3>
            <div className="text-2xl font-serif text-soil mb-3">$10/month</div>
            <p className="text-sm text-charcoal/70 mb-6 leading-relaxed">
              Want to stay connected to the farm without a season commitment?
              Get access to our growing content library of recipes,
              homesteading guides, and more.
            </p>
            <a
              href={
                checkoutLinks
                  ? "/members/checkout?tier=farm_friend"
                  : "/members#farm-friend"
              }
              className="block text-center py-3 px-6 rounded-full font-medium text-sm bg-moss/10 text-moss hover:bg-moss/20 transition-colors border border-moss/20"
            >
              Join as Farm Friend
            </a>
          </div>

          <div className="bg-linen rounded-2xl p-8 border border-linen">
            <div className="text-2xl mb-3">🌱</div>
            <h3 className="font-serif text-xl text-soil mb-2">Try a Month</h3>
            <div className="text-2xl font-serif text-soil mb-3">$150 <span className="text-base font-sans text-charcoal/50">or $140/mo</span></div>
            <p className="text-sm text-charcoal/70 mb-6 leading-relaxed">
              Not sure yet? Experience full season pass membership for one
              month. Your $150 is fully credited toward a season pass if you
              decide to join.
            </p>
            <a
              href={checkoutLinks ? "/members/checkout?tier=try_a_month" : "/members#try-a-month"}
              className="block text-center py-3 px-6 rounded-full font-medium text-sm bg-moss/10 text-moss hover:bg-moss/20 transition-colors border border-moss/20"
            >
              Try a Month
            </a>
          </div>
        </div>
        {/* Community Partner */}
        <div
          className="rounded-2xl shadow-md p-8 max-w-3xl mx-auto"
          style={{ backgroundColor: "#2D3D2A" }}
        >
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left */}
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#B5C9A8", fontVariant: "small-caps" }}>
                For Organizations
              </p>
              <h3 className="font-serif text-2xl sm:text-3xl text-cream mb-4">
                Community Partner
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#D4E8CB" }}>
                5 member seats for your team, organization, or collective. Bring
                your whole community into the work of ecological belonging.
              </p>
            </div>

            {/* Middle */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-baseline justify-between pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#B5C9A8", fontVariant: "small-caps" }}>
                  Early Bird (until June 21)
                </span>
                <span className="font-serif text-2xl text-cream ml-4">$5,000</span>
              </div>
              <div className="flex items-baseline justify-between pt-4 mb-5">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#B5C9A8", fontVariant: "small-caps" }}>
                  Regular Rate
                </span>
                <span className="font-serif text-2xl text-cream ml-4">$9,000</span>
              </div>
              <p className="text-xs mb-3" style={{ color: "#8FAF84" }}>
                Annual · 5 seats included
              </p>
              <ul className="space-y-1.5">
                {[
                  "All individual member perks for 5 people",
                  "Logo on the Hammock Earth website",
                  "Co-branding opportunities",
                ].map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-xs" style={{ color: "#D4E8CB" }}>
                    <span style={{ color: "#8FAF84" }}>✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right */}
            <div className="flex md:items-center">
              <a
                href="mailto:hello@hammock.earth?subject=Community Partner Membership"
                className="block text-center px-8 py-3 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-cream/10"
                style={{ border: "1px solid rgba(255,255,255,0.4)", color: "#F5EFE6" }}
              >
                Get in Touch
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
