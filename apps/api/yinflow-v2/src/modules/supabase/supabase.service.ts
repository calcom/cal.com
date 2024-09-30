import { Injectable } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private supabaseUrl = "https://ogbfbwkftgpdiejqafdq.supabase.co";
  private supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYmZid2tmdGdwZGllanFhZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY2OTY3NzMsImV4cCI6MjAzMjI3Mjc3M30._m1hW5-UcdpgWNUwU9V8RAAvMwOzWOgpbL_ykoPJGIw";
  private supabase;

  constructor() {
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  async getData(table: string) {
    const { data, error } = await this.supabase.from(table).select("*");

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
