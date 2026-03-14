export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="section-label mb-4">Who We Are</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-soil leading-snug mb-6">
              Hammock Earth is a community dedicated to cultivating ecological
              belonging through shared experiences with land, food, and one
              another.
            </h2>
            <div className="space-y-4 text-charcoal/80 leading-relaxed">
              <p>
                We believe that human well-being and ecological health are
                inseparable. When we reconnect with the land that nourishes
                us—through food, seasons, soil, and community—we rediscover a
                deeper sense of belonging and responsibility for the living
                world.
              </p>
              <p>
                Our work creates spaces where people can slow down, reconnect
                with their senses, and experience the culture that grows food.
                Through farm tours, communal meals, workshops, storytelling,
                and immersive gatherings, Hammock Earth invites people into a
                living relationship with the ecosystems that sustain us.
              </p>
              <p>
                Our hope is to nurture a joyful and generous Canadian food
                culture that not only tastes delicious but also regenerates
                soil, strengthens communities, and supports climate resilience
                for generations to come.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <img
              src="/images/IMG_7522.jpg"
              alt="Farm baking with edible flowers"
              className="rounded-2xl w-full h-64 object-cover"
            />
            <img
              src="/images/IMG_7306.jpg"
              alt="Friends on the farm"
              className="rounded-2xl w-full h-64 object-cover mt-8"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
