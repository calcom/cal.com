import * as dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = "ivandro.work@gmail.com";
  const password = "p^y9Ew@O%EWs4x^";

  console.log(`Checking user in Supabase Auth: ${email}`);

  // Check/update in Supabase Auth
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list Supabase users:", listError);
    return;
  }

  const supabaseUser = usersData.users.find((u: any) => u.email === email);

  if (supabaseUser) {
    console.log(`User found in Supabase Auth with ID: ${supabaseUser.id}. Updating password...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(supabaseUser.id, {
      password: password,
      email_confirm: true
    });
    if (updateError) {
      console.error("Failed to update password:", updateError);
    } else {
      console.log("Password updated successfully in Supabase!");
    }
  } else {
    console.log("User not found in Supabase Auth. Creating in Supabase...");
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });
    
    if (createError) {
      console.error("Failed to create user in Supabase:", createError);
    } else {
      console.log("User created successfully in Supabase! ID:", createdUser.user.id);
    }
  }
}

main().catch(console.error);
