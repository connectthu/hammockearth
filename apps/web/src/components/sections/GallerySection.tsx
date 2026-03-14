"use client";

import { useState } from "react";

const images = [
  { src: "/images/IMG_7306.jpg", alt: "Friends on the farm" },
  { src: "/images/IMG_7522.jpg", alt: "Farm baking with edible flowers" },
  { src: "/images/IMG_7479.jpg", alt: "Saffron harvest" },
  { src: "/images/IMG_7489.jpg", alt: "Fields at Hammock Hills" },
  { src: "/images/IMG_7484.jpg", alt: "Trail through the fields" },
  { src: "/images/IMG_7492.jpg", alt: "Fall colours" },
  { src: "/images/IMG_7636.jpg", alt: "Meadow in autumn" },
  { src: "/images/IMG_7644.jpg", alt: "Sky through the meadow" },
  { src: "/images/FullSizeRender.jpg", alt: "Farm chickens" },
  { src: "/images/Farm strawberries.jpg", alt: "Fresh strawberries" },
  { src: "/images/Sugar baby melon.jpg", alt: "Melon on the vine" },
  { src: "/images/Kune Kune kisses.jpg", alt: "Kune Kune pigs" },
];

export function GallerySection() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <section className="py-24 bg-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="section-label mb-4">Life on the Land</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-soil">
            From the Farm
          </h2>
        </div>

        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {images.map((img) => (
            <button
              key={img.src}
              onClick={() => setLightbox(img.src)}
              className="block w-full overflow-hidden rounded-xl group cursor-pointer"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-soil/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-cream/70 hover:text-cream"
            onClick={() => setLightbox(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-screen max-w-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
