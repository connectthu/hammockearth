export function VisitSection() {
  return (
    <section id="visit" className="py-24 bg-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="section-label mb-4">Find Us</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-soil mb-6">
              Come to the Land
            </h2>
            <p className="text-charcoal/70 leading-relaxed mb-8">
              Hammock Hills is located in Hillsdale, Ontario — about an hour
              north of Toronto in Simcoe County, nestled in the hills near
              Georgian Bay country. Easy to get to, easy to exhale once you
              arrive.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-moss/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-soil text-sm">Location</p>
                  <p className="text-charcoal/70 text-sm">
                    4803 Line 2 N, Hillsdale, ON L0L 1V0
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-moss/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-soil text-sm">Getting Here</p>
                  <p className="text-charcoal/70 text-sm">
                    ~1 hour north of Toronto.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-moss/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-soil text-sm">Contact</p>
                  <a
                    href="mailto:hello@hammock.earth"
                    className="text-clay text-sm hover:underline"
                  >
                    hello@hammock.earth
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden aspect-square">
            <img
              src="/images/IMG_7644.jpg"
              alt="Sky through the meadow at Hammock Hills"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
