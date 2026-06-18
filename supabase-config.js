window.VM_SUPABASE = {
  url: "https://mafowlfymohdrgikniss.supabase.co",
  publishableKey: "sb_publishable_m1BguR834QgJzIc7w8yoQQ_aOBKeTLW"
};

window.vmSupabase = window.supabase.createClient(
  window.VM_SUPABASE.url,
  window.VM_SUPABASE.publishableKey
);
