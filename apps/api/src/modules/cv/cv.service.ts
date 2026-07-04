import {
  Injectable,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as pdfParse from 'pdf-parse';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';

@Injectable()
export class CvService {
  private readonly logger = new Logger(CvService.name);

  constructor(@Inject(SUPABASE_ADMIN) private supabase: SupabaseClient) {}

  // ---- Upload PDF and extract text ----
  async uploadCV(
    userId: string,
    file: Express.Multer.File,
    version?: number,
  ) {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be under 5MB');
    }

    // Extract text from PDF
    let extractedText = '';
    let wordCount = 0;
    try {
      const pdfData = await pdfParse(file.buffer);
      // Remove null bytes (\0) which cause PostgreSQL "unsupported Unicode escape sequence" errors
      extractedText = pdfData.text.replace(/\0/g, '').trim();
      wordCount = extractedText.split(/\s+/).filter(Boolean).length;
    } catch (error) {
      this.logger.warn(`PDF parsing failed: ${(error as Error).message}`);
    }

    // Determine version number
    if (!version) {
      const { count } = await this.supabase
        .from('cvs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      version = (count || 0) + 1;
    }

    // Upload to Supabase Storage
    const filePath = `${userId}/cv-v${version}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('cvs')
      .upload(filePath, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('cvs')
      .getPublicUrl(filePath);

    // Save to database
    const { data: cv, error: dbError } = await this.supabase
      .from('cvs')
      .insert({
        user_id: userId,
        file_url: publicUrl,
        file_name: file.originalname,
        file_size: file.size,
        extracted_text: extractedText,
        version,
        word_count: wordCount,
        is_primary: version === 1,
      })
      .select()
      .single();

    if (dbError) throw new BadRequestException(dbError.message);

    return cv;
  }

  // ---- Get all CVs for user ----
  async getUserCVs(userId: string) {
    const { data, error } = await this.supabase
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .order('version', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ---- Set primary CV ----
  async setPrimaryCV(userId: string, cvId: string) {
    // Unset all
    await this.supabase
      .from('cvs')
      .update({ is_primary: false })
      .eq('user_id', userId);

    // Set new primary
    const { data, error } = await this.supabase
      .from('cvs')
      .update({ is_primary: true })
      .eq('id', cvId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ---- Delete CV ----
  async deleteCV(userId: string, cvId: string) {
    const { data: cv } = await this.supabase
      .from('cvs')
      .select('file_url')
      .eq('id', cvId)
      .eq('user_id', userId)
      .single();

    if (cv?.file_url) {
      // Extract path from URL and delete from storage
      const path = cv.file_url.split('/storage/v1/object/public/cvs/')[1];
      if (path) {
        await this.supabase.storage.from('cvs').remove([path]);
      }
    }

    const { error } = await this.supabase
      .from('cvs')
      .delete()
      .eq('id', cvId)
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);
    return { deleted: true };
  }
}
