(async function loadProject() {
  const root = document.getElementById("project-detail");
  const slug = new URLSearchParams(window.location.search).get("slug");
  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);

  if (!slug) {
    root.innerHTML = '<section class="project-not-found"><h1>Project not found.</h1><a href="projects.html">Return to all projects</a></section>';
    return;
  }

  const { data: project, error } = await window.vmSupabase
    .from("projects")
    .select("*, project_images(*)")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !project) {
    root.innerHTML = '<section class="project-not-found"><h1>Project not found.</h1><a href="projects.html">Return to all projects</a></section>';
    return;
  }

  document.title = `${project.title} — Vesa Murtezi Architecture`;
  const gallery = (project.project_images || []).sort((a, b) => a.display_order - b.display_order);
  root.innerHTML = `
    <section class="project-detail-hero">
      <div class="project-detail-title">
        <p class="eyebrow">${escapeHTML(project.category || "Architecture")} · ${escapeHTML(project.location || "")}</p>
        <h1>${escapeHTML(project.title)}</h1>
      </div>
      <img src="${escapeHTML(project.cover_image || "assets/hero-residence.png")}" alt="${escapeHTML(project.title)}">
    </section>
    <section class="project-detail-info section-pad">
      <div><p class="eyebrow">Project</p><p>${escapeHTML(project.title)}</p></div>
      <div><p class="eyebrow">Location</p><p>${escapeHTML(project.location || "—")}</p></div>
      <div><p class="eyebrow">Year</p><p>${escapeHTML(project.project_year || "—")}</p></div>
      <div class="project-detail-description"><p class="eyebrow">About</p><p>${escapeHTML(project.description || "")}</p></div>
    </section>
    ${gallery.length ? `<section class="project-gallery">${gallery.map((image) => `
      <figure><img src="${escapeHTML(image.image_url)}" alt="${escapeHTML(image.alt_text || project.title)}"></figure>
    `).join("")}</section>` : ""}
    <section class="project-next section-pad">
      <p class="eyebrow">Continue exploring</p>
      <a href="projects.html">All <em>projects.</em> ↗</a>
    </section>`;
})();
