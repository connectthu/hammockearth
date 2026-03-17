/**
 * Seed script: test accounts for each role
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node packages/database/seeds/seed-roles.ts
 *
 * ⚠️  Never overwrites accounts with role = 'superadmin'.
 *     Run AFTER migration 007_roles.sql.
 */

import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

interface TestAccount {
  email:     string;
  full_name: string;
  role:      "collaborator" | "member" | "event_customer";
  note:      string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email:     "test-collaborator@hammock.earth",
    full_name: "Test Collaborator",
    role:      "collaborator",
    note:      "Can view assigned events and edit own profile in /collaborator",
  },
  {
    email:     "test-member@hammock.earth",
    full_name: "Test Member",
    role:      "member",
    note:      "Active member with member-level access",
  },
  {
    email:     "test-customer@hammock.earth",
    full_name: "Test Event Customer",
    role:      "event_customer",
    note:      "Default role — registered user, no active membership",
  },
];

async function findOrCreateUser(email: string, full_name: string): Promise<string | null> {
  // Try to create; if already exists, look up
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    user_metadata: { full_name },
    email_confirm: true,
  });

  if (data?.user?.id) return data.user.id;

  if (error) {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => u.email === email);
    if (existing?.id) return existing.id;
    console.error(`  ✗ Could not find or create user ${email}:`, error.message);
    return null;
  }

  return null;
}

async function seed() {
  console.log("Seeding test role accounts…\n");

  for (const account of TEST_ACCOUNTS) {
    console.log(`→ ${account.role.toUpperCase()}: ${account.email}`);

    const userId = await findOrCreateUser(account.email, account.full_name);
    if (!userId) continue;

    // Safety: never overwrite a superadmin
    const { data: existing } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if ((existing as any)?.role === "superadmin") {
      console.log(`  ⚠  Skipped — account has superadmin role, will not downgrade.`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: account.full_name,
        role:      account.role,
      })
      .eq("id", userId);

    if (updateError) {
      console.error(`  ✗ Failed to set role:`, updateError.message);
    } else {
      console.log(`  ✓ Set role = '${account.role}'`);
      console.log(`    Note: ${account.note}`);
    }
  }

  console.log("\nDone. Test accounts use magic-link login at /members/login.");
  console.log("The collaborator account also needs to be linked to events via");
  console.log("INSERT INTO collaborator_events (collaborator_id, event_id) in Supabase Studio.");
}

seed().catch(console.error);
