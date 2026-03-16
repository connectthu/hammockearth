import { Test } from "@nestjs/testing";
import { DiscountCodesService } from "./discount-codes.service";
import { SupabaseService } from "../supabase/supabase.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

const mockSupabase = {
  client: {
    from: jest.fn(),
  },
};

describe("DiscountCodesService", () => {
  let service: DiscountCodesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DiscountCodesService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();
    service = module.get(DiscountCodesService);
    jest.clearAllMocks();
  });

  // ── calculateDiscount ─────────────────────────────────────────────────────

  describe("calculateDiscount", () => {
    it("calculates percent discount correctly", () => {
      const code = { discount_type: "percent", discount_value: 10 } as any;
      // $50 × 2 tickets = $100, 10% off = $10
      expect(service.calculateDiscount(5000, 2, code)).toBe(1000);
    });

    it("calculates fixed discount correctly", () => {
      const code = { discount_type: "fixed", discount_value: 2000 } as any;
      // $20 off a $50 × 1 ticket = $20 off
      expect(service.calculateDiscount(5000, 1, code)).toBe(2000);
    });

    it("caps fixed discount at order total", () => {
      const code = { discount_type: "fixed", discount_value: 99999 } as any;
      // Discount can't exceed the total ($50 × 1 = $50)
      expect(service.calculateDiscount(5000, 1, code)).toBe(5000);
    });

    it("rounds percent discount to whole cents", () => {
      const code = { discount_type: "percent", discount_value: 15 } as any;
      // $33 × 1 = $33, 15% = $4.95 → rounds to $495 cents
      expect(service.calculateDiscount(3300, 1, code)).toBe(495);
    });
  });

  // ── validate ──────────────────────────────────────────────────────────────

  describe("validate", () => {
    const validCode = {
      id: "uuid-1",
      code: "WELCOME10",
      discount_type: "percent",
      discount_value: 10,
      valid_from: "2020-01-01",
      valid_until: null,
      max_uses: null,
      used_count: 0,
    };

    function mockChain(result: any) {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(result),
      };
      mockSupabase.client.from.mockReturnValue(chain);
      return chain;
    }

    it("returns code when valid", async () => {
      mockChain({ data: validCode, error: null });
      const result = await service.validate("WELCOME10");
      expect(result).toMatchObject({ code: "WELCOME10", discount_value: 10 });
    });

    it("throws NotFoundException when code does not exist", async () => {
      mockChain({ data: null, error: { code: "PGRST116" } });
      await expect(service.validate("BADCODE")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when code is expired", async () => {
      mockChain({
        data: { ...validCode, valid_until: "2020-01-01" },
        error: null,
      });
      await expect(service.validate("WELCOME10")).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when max uses reached", async () => {
      mockChain({
        data: { ...validCode, max_uses: 10, used_count: 10 },
        error: null,
      });
      await expect(service.validate("WELCOME10")).rejects.toThrow(BadRequestException);
    });

    it("accepts code that has not yet reached max uses", async () => {
      mockChain({
        data: { ...validCode, max_uses: 10, used_count: 5 },
        error: null,
      });
      const result = await service.validate("WELCOME10");
      expect(result).toBeDefined();
    });
  });
});
