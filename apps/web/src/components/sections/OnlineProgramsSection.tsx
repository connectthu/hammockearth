"use client";

import { useState } from "react";

const programs = [
  {
    emoji: "🌿",
    title: "Ecological Belonging",
    description:
      "An immersive journey into what it means to live in relationship with land, seasons, and community. Practices, stories, and a framework for reconnection.",
  },
  {
    emoji: "🌱",
    title: "Regenerative Food Culture",
    description:
      "Exploring the people, farms, and practices behind a generous Canadian food culture — and how we each play a role in making it real.",
  },
  {
    emoji: "🌙",
    title: "Slow Living Circle",
    description:
      "A monthly online gathering for those called to live with more intention — stories, seasonal practices, and community woven across distances.",
  },
  {
    emoji: "🔥",
    title: "Community by Design",
    description:
      "The principles of intentional community: communication, shared decision-making, land stewardship, and the art of gathering with purpose.",
  },
];

function WaitlistForm({ program }: { program: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth"}/waitlist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: `online_programs_${program}` }),
        }
      );
      if (!res.ok && res.status !== 409) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-moss mt-2">You're on the list!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 text-sm px-4 py-2 rounded-full border border-linen bg-white focus:outline-none focus:ring-2 focus:ring-clay/30"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="text-sm bg-clay text-white px-5 py-2 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
      >
        {status === "loading" ? "..." : "Join waitlist"}
      </button>
    </form>
  );
}

export function OnlineProgramsSection() {
  return (
    <section id="programs" className="py-24 bg-soil">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="section-label text-moss mb-4">From Anywhere</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-cream mb-4">
            Online Programs
          </h2>
          <p className="text-cream/70 max-w-2xl mx-auto">
            Can't make it to the land? Our online offerings bring the spirit of
            Hammock Earth into homes and hearts wherever you are in the world.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {programs.map((p) => (
            <div
              key={p.title}
              className="bg-cream/5 backdrop-blur border border-cream/10 rounded-2xl p-8"
            >
              <div className="text-3xl mb-4">{p.emoji}</div>
              <h3 className="font-serif text-xl text-cream mb-3">{p.title}</h3>
              <p className="text-cream/70 text-sm leading-relaxed mb-4">
                {p.description}
              </p>
              <WaitlistForm program={p.title.toLowerCase().replace(/\s+/g, "_")} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
