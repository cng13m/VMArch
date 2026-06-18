const client = window.vmSupabase;
const loginView = document.getElementById("login-view");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const projectDialog = document.getElementById("project-dialog");
const projectForm = document.getElementById("project-form");
const contentForm = document.getElementById("content-form");
let projects = [];
let editingGallery = [];

const defaults = {
  hero: {
    eyebrow: "Architecture · Prishtina",
    title: "Spaces for<br>quiet <em>living.</em>",
    intro: "We shape enduring places through light, proportion, and an honest expression of material.",
    project_name: "House on the Plain", year: "2026", image_url: ""
  },
  projects: {
    heading: "Built with intention.",
    intro: "Residential and cultural spaces grounded in their landscape, designed to grow more beautiful with time."
  },
  studio: {
    heading: "Architecture as a careful conversation between <em>people</em> and <em>place.</em>",
    description: "Vesa Murtezi is an architecture and interiors studio working across Kosovo and the wider region.",
    years: "12", projects: "38", awards: "07"
  },
  approach: {
    quote: "“Good architecture does not ask for attention. It creates the conditions for life to unfold.”",
    image_url: ""
  },
  contact: {
    heading: "Have a place<br>in <em>mind?</em>",
    address: "Rr. Garibaldi 12<br>10000 Prishtina, Kosovo",
    phone: "+383 44 123 456", email: "studio@vesamurtezi.com"
  }
};

function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 2500);
}

function setBusy(button, busy, label = "Saving…") {
  if (!button) return;
  if (busy) {
    button.dataset.original = button.innerHTML;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.original || button.innerHTML;
    button.disabled = false;
  }
}

async function getAuthorization() {
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) return { authorized: false, error: sessionError.message };
  if (!session?.user) return { authorized: false, error: "No active session." };

  const configuredAdmins = window.VM_SUPABASE.adminUserIds || [];
  if (configuredAdmins.includes(session.user.id)) {
    return { authorized: true, user: session.user };
  }

  const { data, error } = await client.rpc("is_admin");
  if (error) return { authorized: false, error: `Admin verification failed: ${error.message}` };
  return {
    authorized: data === true,
    user: session.user,
    error: data === true ? null : "This account is not registered as a portfolio administrator."
  };
}

async function showDashboard(user) {
  if (!user) {
    const { data } = await client.auth.getUser();
    user = data.user;
  }
  loginView.hidden = true;
  dashboard.hidden = false;
  document.getElementById("admin-email").textContent = user?.email || "";
  await Promise.all([loadProjects(), loadContent()]);
}

async function checkSession() {
  const authorization = await getAuthorization();
  if (authorization.authorized) {
    showDashboard(authorization.user);
  } else {
    await client.auth.signOut();
    loginView.hidden = false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  const errorElement = document.getElementById("login-error");
  errorElement.textContent = "";
  setBusy(button, true, "Signing in…");
  const { data, error } = await client.auth.signInWithPassword({
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value
  });

  if (error) {
    errorElement.textContent = error.message === "Email not confirmed"
      ? "Your Supabase email is not confirmed. Confirm it in Authentication → Users, then try again."
      : error.message;
    setBusy(button, false);
    return;
  }

  const authorization = await getAuthorization();
  if (!authorization.authorized) {
    await client.auth.signOut();
    errorElement.textContent = authorization.error || "This account is not authorized as an administrator.";
    setBusy(button, false);
    return;
  }
  setBusy(button, false);
  showDashboard(data.user);
});

document.getElementById("logout-button").addEventListener("click", async () => {
  await client.auth.signOut();
  location.reload();
});

function switchView(name) {
  document.querySelectorAll(".admin-view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  document.getElementById(`view-${name}`).classList.add("active");
  document.querySelector(".sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
document.querySelector("[data-go-projects]").addEventListener("click", () => switchView("projects"));
document.getElementById("mobile-nav-toggle").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));

async function loadContent() {
  const { data, error } = await client.from("site_content").select("section, content");
  if (error) return toast(`Could not load content: ${error.message}`);
  const sections = { ...defaults };
  (data || []).forEach((row) => { sections[row.section] = { ...defaults[row.section], ...row.content }; });
  Object.entries(sections).forEach(([section, fields]) => {
    Object.entries(fields).forEach(([key, value]) => {
      const input = contentForm.elements[`${section}.${key}`];
      if (input) input.value = value ?? "";
    });
  });
}

document.getElementById("save-content").addEventListener("click", async () => {
  const button = document.getElementById("save-content");
  setBusy(button, true);
  const payload = Object.keys(defaults).map((section) => {
    const content = {};
    Object.keys(defaults[section]).forEach((key) => {
      content[key] = contentForm.elements[`${section}.${key}`]?.value || "";
    });
    return { section, content, updated_at: new Date().toISOString() };
  });
  const { error } = await client.from("site_content").upsert(payload, { onConflict: "section" });
  setBusy(button, false);
  if (error) return toast(`Save failed: ${error.message}`);
  toast("Website content saved");
});

async function uploadImage(file, folder) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("portfolio").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;
  return client.storage.from("portfolio").getPublicUrl(path).data.publicUrl;
}

document.querySelectorAll("[data-content-upload]").forEach((input) => {
  input.addEventListener("change", async () => {
    if (!input.files[0]) return;
    try {
      input.disabled = true;
      const url = await uploadImage(input.files[0], "site");
      contentForm.elements[input.dataset.contentUpload].value = url;
      toast("Image uploaded — save changes to publish");
    } catch (error) {
      toast(`Upload failed: ${error.message}`);
    } finally {
      input.disabled = false;
      input.value = "";
    }
  });
});

function projectRow(project) {
  const image = project.cover_image
    ? (project.cover_image.startsWith("assets/") ? `../${project.cover_image}` : project.cover_image)
    : "../assets/hero-residence.png";
  return `
    <article class="project-row" data-project-id="${project.id}">
      <img src="${image}" alt="">
      <div><h4>${project.title}</h4><p>${project.category || "Architecture"} · ${project.location || ""}</p></div>
      <p>${project.slug}</p>
      <span>${project.project_year || "—"}</span>
      <span class="status ${project.published ? "published" : ""}">${project.published ? "Published" : "Draft"}</span>
    </article>`;
}

function renderProjects() {
  const list = document.getElementById("projects-list");
  const recent = document.getElementById("recent-projects");
  const markup = projects.length ? projects.map(projectRow).join("") : '<div class="empty-state">No projects yet. Create your first project.</div>';
  list.innerHTML = markup;
  recent.innerHTML = projects.length ? projects.slice(0, 5).map(projectRow).join("") : markup;
  document.getElementById("total-projects").textContent = projects.length;
  document.getElementById("published-projects").textContent = projects.filter((project) => project.published).length;
  document.getElementById("draft-projects").textContent = projects.filter((project) => !project.published).length;
  document.getElementById("featured-projects-count").textContent = projects.filter((project) => project.featured).length;
  document.querySelectorAll("[data-project-id]").forEach((row) => {
    row.addEventListener("click", () => openProject(projects.find((project) => project.id === row.dataset.projectId)));
  });
}

async function loadProjects() {
  const { data, error } = await client
    .from("projects")
    .select("*, project_images(*)")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return toast(`Could not load projects: ${error.message}`);
  projects = data || [];
  renderProjects();
}

function renderGallery() {
  document.getElementById("gallery-preview").innerHTML = editingGallery.map((image) => `
    <div class="gallery-item">
      <img src="${image.image_url}" alt="">
      <button type="button" data-delete-image="${image.id}" aria-label="Delete image">×</button>
    </div>`).join("");
  document.querySelectorAll("[data-delete-image]").forEach((button) => button.addEventListener("click", async () => {
    const { error } = await client.from("project_images").delete().eq("id", button.dataset.deleteImage);
    if (error) return toast(`Delete failed: ${error.message}`);
    editingGallery = editingGallery.filter((image) => image.id !== button.dataset.deleteImage);
    renderGallery();
  }));
}

function openProject(project = null) {
  projectForm.reset();
  editingGallery = project?.project_images?.sort((a, b) => a.display_order - b.display_order) || [];
  document.getElementById("dialog-title").textContent = project ? "Edit project" : "New project";
  document.getElementById("delete-project").hidden = !project;
  if (project) {
    ["id", "title", "slug", "category", "location", "project_year", "display_order", "description", "cover_image"].forEach((field) => {
      projectForm.elements[field].value = project[field] ?? "";
    });
    projectForm.elements.featured.checked = project.featured;
    projectForm.elements.published.checked = project.published;
  }
  renderGallery();
  projectDialog.showModal();
}

document.querySelectorAll("[data-open-project]").forEach((button) => button.addEventListener("click", () => openProject()));
document.getElementById("close-dialog").addEventListener("click", () => projectDialog.close());

projectForm.elements.title.addEventListener("input", () => {
  if (!projectForm.elements.id.value) {
    projectForm.elements.slug.value = projectForm.elements.title.value
      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }
});

document.getElementById("cover-upload").addEventListener("change", async (event) => {
  if (!event.target.files[0]) return;
  try {
    event.target.disabled = true;
    projectForm.elements.cover_image.value = await uploadImage(event.target.files[0], "covers");
    toast("Cover uploaded");
  } catch (error) {
    toast(`Upload failed: ${error.message}`);
  } finally {
    event.target.disabled = false;
    event.target.value = "";
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = projectForm.querySelector('[type="submit"]');
  const id = projectForm.elements.id.value;
  setBusy(submit, true);
  const project = {
    title: projectForm.elements.title.value.trim(),
    slug: projectForm.elements.slug.value.trim(),
    category: projectForm.elements.category.value.trim(),
    location: projectForm.elements.location.value.trim(),
    project_year: Number(projectForm.elements.project_year.value) || null,
    display_order: Number(projectForm.elements.display_order.value) || 0,
    description: projectForm.elements.description.value.trim(),
    cover_image: projectForm.elements.cover_image.value.trim(),
    featured: projectForm.elements.featured.checked,
    published: projectForm.elements.published.checked,
    updated_at: new Date().toISOString()
  };
  const query = id
    ? client.from("projects").update(project).eq("id", id).select().single()
    : client.from("projects").insert(project).select().single();
  const { data, error } = await query;
  if (error) {
    setBusy(submit, false);
    document.getElementById("project-message").textContent = error.message;
    return;
  }

  const galleryFiles = [...document.getElementById("gallery-upload").files];
  if (galleryFiles.length) {
    try {
      const start = editingGallery.length;
      const rows = [];
      for (let index = 0; index < galleryFiles.length; index += 1) {
        rows.push({
          project_id: data.id,
          image_url: await uploadImage(galleryFiles[index], `projects/${data.id}`),
          alt_text: data.title,
          display_order: start + index
        });
      }
      const { error: galleryError } = await client.from("project_images").insert(rows);
      if (galleryError) throw galleryError;
    } catch (uploadError) {
      toast(`Project saved, but gallery upload failed: ${uploadError.message}`);
    }
  }

  setBusy(submit, false);
  projectDialog.close();
  toast("Project saved");
  await loadProjects();
});

document.getElementById("delete-project").addEventListener("click", async () => {
  const id = projectForm.elements.id.value;
  if (!id || !confirm("Delete this project and its gallery? This cannot be undone.")) return;
  const { error } = await client.from("projects").delete().eq("id", id);
  if (error) return toast(`Delete failed: ${error.message}`);
  projectDialog.close();
  toast("Project deleted");
  await loadProjects();
});

checkSession();
