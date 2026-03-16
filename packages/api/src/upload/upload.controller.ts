import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../supabase/supabase.service";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Controller("upload")
export class UploadController {
  constructor(
    private supabase: SupabaseService,
    private config: ConfigService
  ) {}

  @Post("event-cover")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_SIZE_BYTES },
    })
  )
  async uploadEventCover(
    @Headers("authorization") auth: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();

    if (!file) throw new BadRequestException("No file provided");

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        "Only JPG, PNG, and WebP images are allowed"
      );
    }

    const ext = file.originalname.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await this.supabase.client.storage
      .from("event-covers")
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);

    const {
      data: { publicUrl },
    } = this.supabase.client.storage
      .from("event-covers")
      .getPublicUrl(data.path);

    return { url: publicUrl };
  }
}
