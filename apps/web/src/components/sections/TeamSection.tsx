export function TeamSection() {
  return (
    <section id="team" className="py-24 bg-linen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="section-label mb-4">Our Story</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-soil mb-8">
            How Hammock Earth Began
          </h2>
          <blockquote className="font-serif text-xl sm:text-2xl text-soil/70 italic max-w-2xl mx-auto mb-8">
            "How do we care for the Heart and the Earth at the same time?"
          </blockquote>
          <p className="text-charcoal/70 leading-relaxed max-w-3xl mx-auto">
            This question sparked a shared calling between Thu Nguyen and
            Anahita, to weave together their paths in community and land.
          </p>
          <p className="text-charcoal/70 leading-relaxed max-w-3xl mx-auto mt-4">
            Thu brings her work in cultivating heart-centered communities and
            spaces for inner transformation. Anahita brings her stewardship of
            land and regenerative approaches to growing and tending.
          </p>
          <p className="text-charcoal/70 leading-relaxed max-w-3xl mx-auto mt-4">
            Hammock Earth is the result: a living space where people can
            reconnect with themselves, each other, and the earth, and grow into
            the dreams and gifts they&apos;re here to bring forward.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Thu */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <img
              src="/images/thu.jpg"
              alt="Thu Nguyen"
              className="w-48 h-48 rounded-full object-cover mb-6 ring-4 ring-linen shadow-lg"
            />
            <h3 className="font-serif text-xl text-soil mb-1">Thu Nguyen</h3>
            <p className="text-moss text-sm font-medium mb-4">
              Somatic Leadership Coach & Community Builder
            </p>
            <p className="text-charcoal/70 text-sm leading-relaxed">
              Thu Nguyen is an entrepreneur, somatic leadership coach, and
              community builder dedicated to cultivating spaces where people
              can reconnect with themselves, one another, and the living earth.
              After two decades working in technology and startups, a series of
              life-altering health experiences led Thu to step away from the
              tech world and explore a deeper path of healing, embodiment, and
              nature connection. Today, with Hammock Earth, Thu focuses on
              creating experiences that cultivate ecological belonging.
            </p>
          </div>

          {/* Anahita */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <img
              src="/images/anahita.jpg"
              alt="Anahita Belanger"
              className="w-48 h-48 rounded-full object-cover mb-6 ring-4 ring-linen shadow-lg"
            />
            <h3 className="font-serif text-xl text-soil mb-1">
              Anahita Belanger
            </h3>
            <p className="text-moss text-sm font-medium mb-4">
              Regenerative Leader & Organic Grower
            </p>
            <p className="text-charcoal/70 text-sm leading-relaxed">
              Anahita Belanger is a regenerative leader and organic grower
              rooted in ecological connection and conscious food systems. She
              pasture-raises heritage hogs and hens and grows vegetables and
              medicinal plants on her certified organic farm, blending her
              reverence for nature with a commitment to nourish both people and
              planet. Combining her experience in ecological agriculture,
              hospitality, and start-up operations, she creates immersive
              experiences where people reconnect with nature and rediscover
              ecological belonging.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
