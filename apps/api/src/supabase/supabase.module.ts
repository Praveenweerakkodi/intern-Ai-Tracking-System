import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
export const SUPABASE_ADMIN = 'SUPABASE_ADMIN';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useFactory: (config: ConfigService) => {
        return createClient(
          (config.get<string>('SUPABASE_URL') || config.get<string>('NEXT_PUBLIC_SUPABASE_URL'))!,
          (config.get<string>('SUPABASE_ANON_KEY') || config.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY'))!,
        );
      },
      inject: [ConfigService],
    },
    {
      provide: SUPABASE_ADMIN,
      useFactory: (config: ConfigService) => {
        return createClient(
          (config.get<string>('SUPABASE_URL') || config.get<string>('NEXT_PUBLIC_SUPABASE_URL'))!,
          config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [SUPABASE_CLIENT, SUPABASE_ADMIN],
})
export class SupabaseModule {}
