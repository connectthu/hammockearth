export function Footer() {
  return (
    <footer className="bg-soil text-cream/80 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div>
            <img src="/logo.svg" alt="Hammock Earth" className="h-10 w-auto mb-4 brightness-0 invert opacity-90" />
            <p className="text-sm text-cream/60 leading-relaxed">
              hammock.earth · Hillsdale, Ontario
            </p>
          </div>

          <nav>
            <p className="text-xs uppercase tracking-widest text-cream/40 mb-4">Navigate</p>
            <div className="space-y-2">
              {[
                ["About", "/#about"],
                ["Events", "/events"],
                ["Online", "/#programs"],
                ["Team", "/#team"],
                ["Visit", "/#visit"],
                ["Contact", "mailto:hello@hammock.earth"],
              ].map(([label, href]) => (
                <a key={href} href={href} className="block text-sm text-cream/70 hover:text-cream transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div>
            <p className="text-xs uppercase tracking-widest text-cream/40 mb-4">Land Acknowledgment</p>
            <p className="text-xs text-cream/50 leading-relaxed">
              Hammock Hills sits on the traditional territory of the Wendat,
              Haudenosaunee, and Anishinaabe peoples, including the Chippewas
              of Rama First Nation. We are grateful to live, work, and gather
              on this land, and we are committed to ongoing relationships of
              respect and reciprocity with Indigenous communities.
            </p>
          </div>
        </div>

        <div className="border-t border-cream/10 pt-8 text-center text-xs text-cream/40">
          © 2026 Hammock Earth · Hillsdale, Ontario
        </div>
      </div>
    </footer>
  );
}
