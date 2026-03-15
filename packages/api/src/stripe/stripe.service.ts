import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(config.getOrThrow<string>("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-01-27.acacia",
    });
  }

  createPaymentIntent(
    amountCents: number,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  updatePaymentIntentMetadata(
    paymentIntentId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.update(paymentIntentId, { metadata });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.config.getOrThrow<string>("STRIPE_WEBHOOK_SECRET");
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
