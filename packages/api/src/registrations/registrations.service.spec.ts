import { Test } from "@nestjs/testing";
import { RegistrationsService } from "./registrations.service";
import { SupabaseService } from "../supabase/supabase.service";
import { StripeService } from "../stripe/stripe.service";
import { EmailService } from "../email/email.service";
import { EventsService } from "../events/events.service";
import { DiscountCodesService } from "../discount-codes/discount-codes.service";

const mockEvent = {
  id: "event-uuid",
  slug: "mushroom-workshop",
  title: "Mushroom Workshop",
  price_cents: 7500,
  start_at: "2026-06-01T10:00:00Z",
  end_at: "2026-06-01T14:00:00Z",
  location: "Hammock Hills",
  description: null,
};

const mockPaymentIntent = {
  id: "pi_test_123",
  client_secret: "pi_test_123_secret_abc",
};

function makeSupabaseMock(overrides: Record<string, any> = {}) {
  return {
    client: {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides,
      }),
    },
  };
}

describe("RegistrationsService", () => {
  let service: RegistrationsService;
  let mockSupabase: any;
  let mockStripe: any;
  let mockEmail: any;
  let mockEvents: any;
  let mockDiscountCodes: any;

  beforeEach(async () => {
    mockSupabase = makeSupabaseMock();
    mockStripe = {
      createPaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
      updatePaymentIntentMetadata: jest.fn().mockResolvedValue({}),
    };
    mockEmail = {
      bookingConfirmation: jest.fn().mockResolvedValue(undefined),
      eventWaitlistConfirmation: jest.fn().mockResolvedValue(undefined),
    };
    mockEvents = {
      findBySlug: jest.fn().mockResolvedValue(mockEvent),
    };
    mockDiscountCodes = {
      validate: jest.fn(),
      calculateDiscount: jest.fn().mockReturnValue(0),
      incrementUsedCount: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: StripeService, useValue: mockStripe },
        { provide: EmailService, useValue: mockEmail },
        { provide: EventsService, useValue: mockEvents },
        { provide: DiscountCodesService, useValue: mockDiscountCodes },
      ],
    }).compile();

    service = module.get(RegistrationsService);
    jest.clearAllMocks();

    // Re-assign after clearAllMocks
    mockEvents.findBySlug.mockResolvedValue(mockEvent);
    mockStripe.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
    mockStripe.updatePaymentIntentMetadata.mockResolvedValue({});
    mockEmail.eventWaitlistConfirmation.mockResolvedValue(undefined);
    mockDiscountCodes.calculateDiscount.mockReturnValue(0);
  });

  // ── Normal registration flow ──────────────────────────────────────────────

  describe("createRegistration — normal flow", () => {
    const dto = {
      eventSlug: "mushroom-workshop",
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      quantity: 1,
    };

    beforeEach(() => {
      // Capacity: 10 spots remaining
      const capacityChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { spots_remaining: 10 },
          error: null,
        }),
      };
      // Registration insert
      const insertChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "reg-uuid", status: "pending" },
          error: null,
        }),
      };
      mockSupabase.client.from
        .mockReturnValueOnce(capacityChain)
        .mockReturnValueOnce(insertChain);
    });

    it("returns clientSecret and registrationId", async () => {
      const result = await service.createRegistration(dto as any);
      expect(result.status).toBe("pending");
      expect(result.clientSecret).toBe("pi_test_123_secret_abc");
      expect(result.registrationId).toBe("reg-uuid");
    });

    it("creates a Stripe PaymentIntent with correct amount", async () => {
      await service.createRegistration(dto as any);
      expect(mockStripe.createPaymentIntent).toHaveBeenCalledWith(
        7500, // $75 × 1
        expect.objectContaining({ eventSlug: "mushroom-workshop" })
      );
    });

    it("multiplies price by quantity", async () => {
      // Reset chains for 2 tickets
      const capacityChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { spots_remaining: 10 },
          error: null,
        }),
      };
      const insertChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "reg-uuid-2", status: "pending" },
          error: null,
        }),
      };
      mockSupabase.client.from
        .mockReturnValueOnce(capacityChain)
        .mockReturnValueOnce(insertChain);

      await service.createRegistration({ ...dto, quantity: 2 } as any);
      expect(mockStripe.createPaymentIntent).toHaveBeenCalledWith(
        15000, // $75 × 2
        expect.anything()
      );
    });
  });

  // ── Waitlist flow ─────────────────────────────────────────────────────────

  describe("createRegistration — waitlist flow", () => {
    const dto = {
      eventSlug: "mushroom-workshop",
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      quantity: 1,
    };

    beforeEach(() => {
      const capacityChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { spots_remaining: 0 },
          error: null,
        }),
      };
      const insertChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "reg-waitlist-uuid", status: "waitlisted" },
          error: null,
        }),
      };
      mockSupabase.client.from
        .mockReturnValueOnce(capacityChain)
        .mockReturnValueOnce(insertChain);
    });

    it("returns waitlisted status when at capacity", async () => {
      const result = await service.createRegistration(dto as any);
      expect(result.status).toBe("waitlisted");
    });

    it("does not create a Stripe PaymentIntent", async () => {
      await service.createRegistration(dto as any);
      expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
    });

    it("sends waitlist confirmation email", async () => {
      await service.createRegistration(dto as any);
      expect(mockEmail.eventWaitlistConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ to: "jane@example.com" })
      );
    });
  });

  // ── Discount code ─────────────────────────────────────────────────────────

  describe("createRegistration — with discount code", () => {
    const dto = {
      eventSlug: "mushroom-workshop",
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      quantity: 1,
      discountCode: "WELCOME10",
    };

    beforeEach(() => {
      const capacityChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { spots_remaining: 10 },
          error: null,
        }),
      };
      const insertChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "reg-uuid", status: "pending" },
          error: null,
        }),
      };
      mockSupabase.client.from
        .mockReturnValueOnce(capacityChain)
        .mockReturnValueOnce(insertChain);

      mockDiscountCodes.validate.mockResolvedValue({
        id: "code-uuid",
        discount_type: "percent",
        discount_value: 10,
      });
      mockDiscountCodes.calculateDiscount.mockReturnValue(750); // 10% of $75
    });

    it("applies discount to PaymentIntent amount", async () => {
      await service.createRegistration(dto as any);
      expect(mockStripe.createPaymentIntent).toHaveBeenCalledWith(
        6750, // $75 - $7.50
        expect.anything()
      );
    });

    it("returns discounted amountCents", async () => {
      const result = await service.createRegistration(dto as any);
      expect(result.amountCents).toBe(6750);
    });
  });
});
