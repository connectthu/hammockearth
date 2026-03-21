"use client";

export function ProfileNav({ name }: { name: string }) {
  return (
    <nav className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-linen h-14">
      <div className="max-w-6xl mx-auto px-8 flex justify-between items-center h-full">
        <a href="#about" className="font-serif text-soil hover:text-clay transition-colors">
          {name}
        </a>
        <div className="hidden sm:flex items-center gap-8 text-sm text-soil/60">
          <a href="#about" className="hover:text-soil transition-colors">About</a>
          <a href="#offering" className="hover:text-soil transition-colors">Offering</a>
          <a href="#book" className="hover:text-soil transition-colors">Book a Session</a>
        </div>
        <a
          href="#book"
          className="bg-soil text-cream rounded-full px-5 py-2 text-sm hover:bg-clay transition-colors"
        >
          Contact
        </a>
      </div>
    </nav>
  );
}
