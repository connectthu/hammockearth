"use client";

import { useState } from "react";

const team = [
  {
    name: "Thu",
    desc: "Somatic leadership coach & community builder",
    img: "/images/team/thu.jpg",
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    name: "Anahita",
    desc: "Regenerative leader & organic grower",
    img: "/images/team/anahita.jpg",
    span: "lg:row-span-2",
  },
  {
    name: "Tyler",
    desc: "Chef & culinary grower",
    img: "/images/team/tyler.jpg",
    span: "",
  },
  {
    name: "Sophie",
    desc: "Dancer, choreographer, trickster",
    img: "/images/team/sophie.jpg",
    span: "",
  },
  {
    name: "Stephanie",
    desc: "Yoga, meditation & breathwork teacher",
    img: "/images/team/stephanie.jpg",
    span: "lg:col-span-2",
  },
  {
    name: "Terrence",
    desc: "Strategist, facilitator & care advocate",
    img: "/images/team/terrence.png",
    span: "lg:row-span-2",
  },
  {
    name: "Bela Shah",
    desc: "Coach, self-compassion & authentic leadership",
    img: "/images/team/bela.jpg",
    span: "",
  },
  {
    name: "Clarence",
    desc: "Creative generalist, visual explorer",
    img: "/images/team/clarence.png",
    span: "lg:col-span-2",
  },
  {
    name: "Anto",
    desc: "Arts community builder, expressive arts & ancestral healing",
    img: "/images/team/anto.jpg",
    span: "",
  },
  {
    name: "Jasjit Sangha",
    desc: "Mindfulness teacher & community cultivator",
    img: "/images/team/jasjit.jpg",
    span: "lg:row-span-2",
  },
  {
    name: "Chenny Xia",
    desc: "Entrepreneur & health and gender equity advocate",
    img: "/images/team/chenny.jpg",
    span: "",
  },
  {
    name: "Mirka",
    desc: "Artist, arts educator & champion of creative play",
    img: "/images/team/mirka.jpg",
    span: "lg:col-span-2",
  },
  {
    name: "Erin",
    desc: "Creator, culture builder & architect of belonging",
    img: "/images/team/erin.jpg",
    span: "",
  },
];

export function TeamMosaicSection() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="py-24 bg-soil">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-clay text-xs font-semibold uppercase tracking-widest mb-4">
            Our Community
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-cream mb-4">
            The Heart of Hammock Earth
          </h2>
          <p className="text-cream/60 text-lg italic max-w-xl mx-auto">
            A living tapestry of the souls who breathe life into our mission.
          </p>
        </div>

        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3"
          style={{ gridAutoRows: "220px", gridAutoFlow: "row dense" }}
        >
          {team.map((person) => (
            <div
              key={person.name}
              className={`relative overflow-hidden rounded-xl cursor-pointer group ${person.span}`}
              onClick={() =>
                setActive(active === person.name ? null : person.name)
              }
            >
              <img
                src={person.img}
                alt={person.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Overlay — CSS hover on desktop, tap-toggle on mobile */}
              <div
                className={`absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-300 ${
                  active === person.name
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                style={{ background: "rgba(59, 47, 47, 0.78)" }}
              >
                <p className="font-serif text-white font-bold text-sm leading-snug">
                  {person.name}
                </p>
                <p className="text-white/80 text-xs mt-1 leading-snug font-sans">
                  {person.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
