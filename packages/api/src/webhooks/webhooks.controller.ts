import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import { RawBodyRequest } from "@nestjs/common";
import { Request } from "express";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post("stripe")
  @HttpCode(200)
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") sig: string
  ) {
    if (!req.rawBody) {
      throw new BadRequestException("Missing raw body");
    }
    await this.webhooksService.handleStripe(req.rawBody, sig);
    return { received: true };
  }
}
