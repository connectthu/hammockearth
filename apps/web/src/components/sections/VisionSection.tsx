export function VisionSection() {
  return (
    <section className="py-24 bg-soil text-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="section-label text-moss mb-6">Our Vision</p>
        <blockquote className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream leading-snug mb-10 italic">
          "To grow global well-being through ecological belonging."
        </blockquote>
        <div className="border-t border-cream/20 pt-10">
          <p className="text-base sm:text-lg text-cream/80 leading-relaxed max-w-3xl mx-auto">
            <a
              href="https://www.ecological-belonging.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 decoration-cream/40 hover:decoration-cream transition-colors"
            >
              Ecological belonging
            </a>{" "}
            is remembering that we are part of nature, not
            separate from it. Our well-being is shaped by how we care for the
            land that sustains us—our food systems, animals, water, and one
            another across generations. It is the lived experience of being in
            relationship with land, food, seasons, and community, where care
            for the earth and care for people are understood as the same act.
          </p>
        </div>
      </div>
    </section>
  );
}
