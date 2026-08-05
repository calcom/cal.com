import * as dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = "ivandro.work@gmail.com";
  const password = "p^y9Ew@O%EWs4x^";

  console.log(`Testing login for: ${email}`);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login succeeded!", data.user?.id);
  }
}

main().catch(console.error);
