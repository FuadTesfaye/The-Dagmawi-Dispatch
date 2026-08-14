import { type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await createClient(request)
}

export const config = {
  matcher: [
    /*
     * Skip API routes (webhook, cron, web proxies) — no Supabase session needed there.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
