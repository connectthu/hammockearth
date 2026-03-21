import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly TOKEN_URL = "https://oauth2.googleapis.com/token";
  private readonly API_URL = "https://www.googleapis.com/calendar/v3";
  private readonly SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ].join(" ");

  constructor(private config: ConfigService) {}

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.get<string>("GOOGLE_CLIENT_ID") ?? "",
      redirect_uri: this.config.get<string>("GOOGLE_REDIRECT_URI") ?? "",
      response_type: "code",
      scope: this.SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${this.AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{
    refreshToken: string;
    accessToken: string;
    email: string;
  }> {
    const res = await fetch(this.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.config.get<string>("GOOGLE_CLIENT_ID") ?? "",
        client_secret: this.config.get<string>("GOOGLE_CLIENT_SECRET") ?? "",
        redirect_uri: this.config.get<string>("GOOGLE_REDIRECT_URI") ?? "",
        grant_type: "authorization_code",
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!data["refresh_token"]) {
      this.logger.error("Google token exchange failed", data);
      throw new Error("No refresh token received from Google");
    }
    const email = await this.getUserEmail(data["access_token"] as string);
    return {
      refreshToken: data["refresh_token"] as string,
      accessToken: data["access_token"] as string,
      email,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const res = await fetch(this.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.get<string>("GOOGLE_CLIENT_ID") ?? "",
        client_secret: this.config.get<string>("GOOGLE_CLIENT_SECRET") ?? "",
        grant_type: "refresh_token",
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!data["access_token"]) throw new Error("Failed to refresh Google access token");
    return data["access_token"] as string;
  }

  private async getUserEmail(accessToken: string): Promise<string> {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as Record<string, unknown>;
    return (data["email"] as string) ?? "";
  }

  async getBusyTimes(
    refreshToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<Array<{ start: string; end: string }>> {
    const accessToken = await this.refreshAccessToken(refreshToken);
    const res = await fetch(`${this.API_URL}/freeBusy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    const calendars = data["calendars"] as Record<string, { busy: Array<{ start: string; end: string }> }>;
    return calendars?.[calendarId]?.busy ?? [];
  }

  async createEvent(
    refreshToken: string,
    calendarId: string,
    event: {
      summary: string;
      description?: string;
      start: string; // ISO
      end: string;   // ISO
      location?: string;
    }
  ): Promise<string> {
    const accessToken = await this.refreshAccessToken(refreshToken);
    const res = await fetch(
      `${this.API_URL}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: { dateTime: event.start },
          end: { dateTime: event.end },
        }),
      }
    );
    const data = (await res.json()) as Record<string, unknown>;
    if (!data["id"]) {
      this.logger.error("Failed to create Google Calendar event", data);
      throw new Error("Failed to create Google Calendar event");
    }
    return data["id"] as string;
  }

  async deleteEvent(
    refreshToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const accessToken = await this.refreshAccessToken(refreshToken);
    await fetch(
      `${this.API_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  }
}
