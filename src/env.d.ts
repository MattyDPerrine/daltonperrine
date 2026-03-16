/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** The authenticated admin user, set by src/middleware.ts */
    user: import('@supabase/supabase-js').User | null;
  }
}
