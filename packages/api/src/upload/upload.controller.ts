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

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_MEDIA_TYPES = [
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/quicktime", "video/webm",
  "audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav",
  "application/pdf",
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;   // 5MB images
const MAX_MEDIA_BYTES = 200 * 1024 * 1024; // 200MB media

@Controller("upload")
export class UploadController {
  constructor(
    private supabase: SupabaseService,
    private config: ConfigService
  ) {}

  @Post("event-cover")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_SIZE_BYTES } }))
  async uploadEventCover(
    @Headers("authorization") auth: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    this.requireAdmin(auth);
    return this.uploadImage(file, "event-covers");
  }

  @Post("content-cover")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_SIZE_BYTES } }))
  async uploadContentCover(
    @Headers("authorization") auth: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    this.requireAdmin(auth);
    return this.uploadImage(file, "content-library");
  }

  @Post("content-media")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_MEDIA_BYTES } }))
  async uploadContentMedia(
    @Headers("authorization") auth: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    this.requireAdmin(auth);
    if (!file) throw new BadRequestException("No file provided");
    if (!ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Unsupported file type");
    }

    const ext = file.originalname.split(".").pop() ?? "bin";
    const filename = `media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await this.supabase.client.storage
      .from("content-library")
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);

    const { data: { publicUrl } } = this.supabase.client.storage
      .from("content-library")
      .getPublicUrl(data.path);

    return { url: publicUrl, kind: this.resolveMediaKind(file.mimetype) };
  }

  private requireAdmin(auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }

  private async uploadImage(file: Express.Multer.File, bucket: string) {
    if (!file) throw new BadRequestException("No file provided");
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Only JPG, PNG, and WebP images are allowed");
    }

    const ext = file.originalname.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await this.supabase.client.storage
      .from(bucket)
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);

    const { data: { publicUrl } } = this.supabase.client.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrl };
  }

  private resolveMediaKind(mimeType: string): string {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf") return "pdf";
    return "video";
  }
}
