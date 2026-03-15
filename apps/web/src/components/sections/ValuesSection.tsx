const values = [
  {
    emoji: "🕊️",
    title: "Peace, Joy & Kindness",
    body: "Cultures of care and generosity create the conditions for thriving communities.",
  },
  {
    emoji: "🌿",
    title: "Community & Interconnectedness",
    body: "People, land, and ecosystems are deeply interconnected; meaningful change happens through relationship.",
  },
  {
    emoji: "✦",
    title: "Excellence",
    body: "Experiences that are thoughtful, beautiful, and grounded in care for both people and the earth.",
  },
];

export function ValuesSection() {
  return (
    <section id="values" className="py-24 bg-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="section-label mb-4">What We Stand For</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-soil">Our Values</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {values.map((v) => (
            <div
              key={v.title}
              className="bg-linen rounded-2xl p-8 text-center"
            >
              <div className="text-4xl mb-4">{v.emoji}</div>
              <h3 className="font-serif text-xl text-soil mb-3">{v.title}</h3>
              <p className="text-charcoal/70 leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
