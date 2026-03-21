import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return !!(
      this.config.get<string>("ZOOM_ACCOUNT_ID") &&
      this.config.get<string>("ZOOM_CLIENT_ID") &&
      this.config.get<string>("ZOOM_CLIENT_SECRET")
    );
  }

  private async getAccessToken(): Promise<string> {
    const accountId = this.config.get<string>("ZOOM_ACCOUNT_ID");
    const clientId = this.config.get<string>("ZOOM_CLIENT_ID");
    const clientSecret = this.config.get<string>("ZOOM_CLIENT_SECRET");
    if (!accountId || !clientId || !clientSecret) throw new Error("Zoom not configured");

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}` },
      }
    );
    const data = (await res.json()) as Record<string, unknown>;
    if (!data["access_token"]) throw new Error("Failed to get Zoom access token");
    return data["access_token"] as string;
  }

  async createMeeting(
    topic: string,
    startAt: string, // ISO UTC
    durationMinutes: number
  ): Promise<{ id: string; joinUrl: string }> {
    const accessToken = await this.getAccessToken();
    const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2, // scheduled
        start_time: startAt,
        duration: durationMinutes,
        settings: {
          join_before_host: true,
          waiting_room: false,
          approval_type: 2,
        },
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!data["join_url"]) {
      this.logger.error("Failed to create Zoom meeting", data);
      throw new Error("Failed to create Zoom meeting");
    }
    return {
      id: String(data["id"]),
      joinUrl: data["join_url"] as string,
    };
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
