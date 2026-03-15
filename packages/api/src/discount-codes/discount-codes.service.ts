import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { DiscountCode } from "@hammock/database";
import type { CreateDiscountCodeDto } from "./dto/create-discount-code.dto";

@Injectable()
export class DiscountCodesService {
  constructor(private supabase: SupabaseService) {}

  async validate(codeStr: string): Promise<DiscountCode> {
    const upperCode = codeStr.toUpperCase();
    const now = new Date().toISOString();

    const { data, error } = await this.supabase.client
      .from("discount_codes")
      .select("*")
      .eq("code", upperCode)
      .single();

    if (error || !data) throw new NotFoundException("Discount code not found");

    const dc = data as unknown as DiscountCode;

    if (dc.valid_from && dc.valid_from > now) {
      throw new BadRequestException("Discount code is not yet active");
    }
    if (dc.valid_until && dc.valid_until < now) {
      throw new BadRequestException("Discount code has expired");
    }
    if (dc.max_uses !== null && dc.used_count >= dc.max_uses) {
      throw new BadRequestException("Discount code has reached its usage limit");
    }

    return dc;
  }

  calculateDiscount(
    priceCents: number,
    quantity: number,
    code: DiscountCode
  ): number {
    if (code.discount_type === "percent") {
      return Math.round((priceCents * quantity * code.discount_value) / 100);
    }
    // fixed is an order-level discount
    return Math.min(code.discount_value, priceCents * quantity);
  }

  async incrementUsedCount(id: string): Promise<void> {
    const { data } = await this.supabase.client
      .from("discount_codes")
      .select("used_count")
      .eq("id", id)
      .single();
    if (data) {
      const dc = data as unknown as DiscountCode;
      await this.supabase.client
        .from("discount_codes")
        .update({ used_count: dc.used_count + 1 })
        .eq("id", id);
    }
  }

  async findAll(): Promise<DiscountCode[]> {
    const { data, error } = await this.supabase.client
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DiscountCode[];
  }

  async create(dto: CreateDiscountCodeDto): Promise<DiscountCode> {
    const { data, error } = await this.supabase.client
      .from("discount_codes")
      .insert({
        code: dto.code.toUpperCase(),
        description: dto.description ?? null,
        discount_type: dto.discount_type,
        discount_value: dto.discount_value,
        max_uses: dto.max_uses ?? null,
        valid_from: dto.valid_from ?? new Date().toISOString(),
        valid_until: dto.valid_until ?? null,
        members_only: dto.members_only ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as DiscountCode;
  }

  async remove(id: string) {
    const { error } = await this.supabase.client
      .from("discount_codes")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { success: true };
  }
}
