import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

export default async function CancelBookingPage({
  params,
}: {
  params: { slug: string; token: string };
}) {
  const res = await fetch(`${API_URL}/bookings/cancel/${params.token}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  const success = res.ok;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        {success ? (
          <>
            <div className="w-16 h-16 rounded-full bg-linen flex items-center justify-center mx-auto text-2xl">
              🍃
            </div>
            <h1 className="font-serif text-2xl text-soil">Booking Cancelled</h1>
            <p className="text-soil/60 text-sm leading-relaxed">
              Your session has been cancelled. A confirmation has been sent to your email.
            </p>
            <a
              href={`/profile/${params.slug}`}
              className="inline-block mt-2 px-6 py-3 rounded-full bg-clay text-white text-sm font-medium hover:bg-clay/90 transition-colors"
            >
              Book a new session
            </a>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-linen flex items-center justify-center mx-auto text-2xl">
              ✗
            </div>
            <h1 className="font-serif text-2xl text-soil">Unable to Cancel</h1>
            <p className="text-soil/60 text-sm">
              This booking may have already been cancelled or the link has expired.
            </p>
            <a
              href={`/profile/${params.slug}`}
              className="inline-block mt-2 px-6 py-3 rounded-full bg-linen text-soil text-sm font-medium hover:bg-linen/80 transition-colors border border-linen"
            >
              Return to booking page
            </a>
          </>
        )}
      </div>
    </div>
  );
}
