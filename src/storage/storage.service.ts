import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID') ?? '';
    this.bucket = config.get<string>('R2_BUCKET') ?? 'immoafric-media';
    this.publicUrl = config.get<string>('R2_PUBLIC_URL') ?? '';

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: 'properties' | 'avatars' | 'agencies' | 'blog' | 'professionals' | 'docs',
  ): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000',
      }),
    );

    return `${this.publicUrl}/${key}`;
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder: 'properties' | 'avatars' | 'agencies' | 'blog' | 'professionals' | 'docs',
  ): Promise<string[]> {
    return Promise.all(files.map((f) => this.uploadFile(f, folder)));
  }

  async deleteFile(url: string): Promise<void> {
    const key = url.replace(`${this.publicUrl}/`, '');
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      // Silently fail on delete — file might already be gone
    }
  }
}
