import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-6xl mb-6">🌿</p>
          <h1 className="font-serif text-4xl text-soil mb-4">
            Page not found
          </h1>
          <p className="text-charcoal/60 mb-8">
            This page has wandered off into the meadow.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-clay text-white font-medium px-8 py-3 rounded-full hover:bg-clay/90 transition-colors"
          >
            Return home
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
