"use client";

const team = [
  {
    name: "Thu",
    role: "Somatic Leadership Coach & Community Builder",
    img: "/images/team/thu.jpg",
  },
  {
    name: "Anahita",
    role: "Regenerative Leader & Organic Grower",
    img: "/images/team/anahita.jpg",
  },
  {
    name: "Tyler",
    role: "Chef & Culinary Grower",
    img: "/images/team/tyler.jpg",
  },
  {
    name: "Sophie",
    role: "Dancer, Choreographer, Trickster",
    img: "/images/team/sophie.jpg",
  },
  {
    name: "Stephanie",
    role: "Calm. Yoga, Meditation & Breathwork Teacher",
    img: "/images/team/steph.jpg",
  },
  {
    name: "Terrence",
    role: "Gratitude. Strategist, Facilitator & Care Advocate",
    img: "/images/team/terrence.png",
    objPos: "object-top",
  },
  {
    name: "Bela",
    role: "Self-Compassion. Authentic Leadership Coach",
    img: "/images/team/bela.jpg",
  },
  {
    name: "Clarence",
    role: "Perspective. Creative Generalist, Visual Explorer",
    img: "/images/team/clarence.png",
  },
  {
    name: "Anto",
    role: "Expressive Arts Therapist & InnerGenerational Community Builder",
    img: "/images/team/anto.jpg",
    objPos: "object-top",
  },
  {
    name: "Jasjit",
    role: "Mindfulness Teacher & Community Cultivator",
    img: "/images/team/jasjit.jpg",
  },
  {
    name: "Chenny",
    role: "Courage. Entrepreneur & Health and Gender Equity Advocate",
    img: "/images/team/chenny.jpg",
  },
  {
    name: "Mirka",
    role: "Artist, Arts Educator & Champion of Creative Play",
    img: "/images/team/mirka.jpeg",
  },
  {
    name: "Erin",
    role: "Creator, Culture Builder & Architect of Belonging",
    img: "/images/team/erin.jpg",
    objPos: "object-top",
  },
];

export function TeamMosaicSection() {
  return (
    <section className="py-24 bg-linen overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="text-center">
          <p className="text-clay text-xs font-semibold uppercase tracking-widest mb-4">
            Our Community
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-soil mb-4">
            The Heart of Hammock Earth
          </h2>
          <p className="text-soil/60 text-lg italic max-w-xl mx-auto">
            A living tapestry of the souls who breathe life into our mission.
          </p>
        </div>
      </div>

      <div className="relative">
        <div
          className="flex gap-5 overflow-x-auto px-8 sm:px-12 lg:px-16 pb-16 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {team.map((person, i) => (
            <div
              key={person.name}
              className="flex-shrink-0"
              style={{ width: "210px", marginTop: i % 2 === 1 ? "48px" : "0" }}
            >
              <div className="rounded-2xl overflow-hidden shadow-md mb-4" style={{ background: "#FBF7F0" }}>
                <img
                  src={person.img}
                  alt={person.name}
                  className={`w-full object-cover ${person.objPos ?? "object-center"}`}
                  style={{ height: "270px", filter: "grayscale(100%)" }}
                />
              </div>
              <p className="font-serif italic text-soil text-base leading-tight mb-1">
                {person.name}
              </p>
              <p
                className="text-xs leading-snug"
                style={{ color: "#4A4A4A", fontVariant: "small-caps" }}
              >
                {person.role}
              </p>
            </div>
          ))}
        </div>

        {/* Right fade hint */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-32"
          style={{ background: "linear-gradient(to left, #F5EFE6, transparent)" }}
        />
      </div>
    </section>
  );
}
