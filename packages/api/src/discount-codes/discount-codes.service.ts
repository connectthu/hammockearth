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

  async validate(code: string): Promise<DiscountCode> {
    const upperCode = code.toUpperCase();
    const now = new Date().toISOString();

    const { data, error } = await this.supabase.client
      .from("discount_codes")
      .select("*")
      .eq("code", upperCode)
      .single();

    if (error || !data) throw new NotFoundException("Discount code not found");

    if (data.valid_from && data.valid_from > now) {
      throw new BadRequestException("Discount code is not yet active");
    }
    if (data.valid_until && data.valid_until < now) {
      throw new BadRequestException("Discount code has expired");
    }
    if (data.max_uses !== null && data.used_count >= data.max_uses) {
      throw new BadRequestException("Discount code has reached its usage limit");
    }

    return data;
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
    // Read current count, then increment (good enough for low-volume use)
    const { data } = await this.supabase.client
      .from("discount_codes")
      .select("used_count")
      .eq("id", id)
      .single();
    if (data) {
      await this.supabase.client
        .from("discount_codes")
        .update({ used_count: data.used_count + 1 })
        .eq("id", id);
    }
  }

  async findAll() {
    const { data, error } = await this.supabase.client
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async create(dto: CreateDiscountCodeDto) {
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
    return data;
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
