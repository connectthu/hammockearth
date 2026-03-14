export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/images/IMG_7489.jpg"
          alt="Fields at Hammock Hills"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-soil/50" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">
        <p className="section-label text-cream/70 mb-6">Hammock Earth</p>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-cream leading-tight mb-6">
          Cultivating fertile ground for people, land, and possibility.
        </h1>

        <p className="text-lg sm:text-xl text-cream/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          A community dedicated to cultivating ecological belonging through
          shared experiences with land, food, and one another.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/events"
            className="inline-flex items-center gap-2 bg-clay text-white font-medium px-8 py-4 rounded-full hover:bg-clay/90 transition-colors text-base"
          >
            Upcoming Events
          </a>
          <a
            href="/#about"
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-cream font-medium px-8 py-4 rounded-full hover:bg-white/20 transition-colors text-base border border-cream/20"
          >
            About Us
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-cream/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
