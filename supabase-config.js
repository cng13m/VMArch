window.VM_SUPABASE = {
  url: "https://mafowlfymohdrgikniss.supabase.co",
  publishableKey: "sb_publishable_m1BguR834QgJzIc7w8yoQQ_aOBKeTLW",
  adminUserIds: ["3ff5719b-ff86-48f8-82d9-93225f539cc3"]
};

window.vmSupabase = window.supabase.createClient(
  window.VM_SUPABASE.url,
  window.VM_SUPABASE.publishableKey
);
