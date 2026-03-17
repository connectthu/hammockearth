import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(config.getOrThrow<string>("STRIPE_SECRET_KEY"), {
      apiVersion: "2024-06-20",
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

  createCustomer(email: string, metadata: Record<string, string>): Promise<Stripe.Customer> {
    return this.stripe.customers.create({ email, metadata });
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.Subscription & { latest_invoice: Stripe.Invoice & { payment_intent: Stripe.PaymentIntent } }> {
    const sub = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata,
    });
    return sub as any;
  }

  cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.config.getOrThrow<string>("STRIPE_WEBHOOK_SECRET");
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
