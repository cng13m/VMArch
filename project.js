(async function loadProject() {
  const root = document.getElementById("project-detail");
  const slug = new URLSearchParams(window.location.search).get("slug");
  const fallbackProjects = {
    "house-on-the-plain": {
      title: "House on the Plain", category: "Residential", location: "Prishtina",
      project_year: 2026, cover_image: "assets/hero-residence.png",
      description: "A quiet family home organized around light, long views, and a restrained palette of concrete, timber, and stone.",
      project_images: []
    },
    "house-among-trees": {
      title: "House Among Trees", category: "Residential", location: "Brezovicë",
      project_year: 2025, cover_image: "assets/forest-house.png",
      description: "A slender woodland residence that settles carefully between mature trees, pairing transparent living spaces with a warm folded timber roof.",
      project_images: []
    },
    "inner-garden": {
      title: "Inner Garden", category: "Residential", location: "Prishtina",
      project_year: 2024, cover_image: "assets/courtyard-house.png",
      description: "A sequence of calm rooms and sheltered courtyards shaped around a single tree, where filtered daylight becomes the primary material.",
      project_images: []
    },
    "coastal-retreat": {
      title: "Coastal Retreat", category: "Hospitality", location: "Ulqin",
      project_year: 2026, cover_image: "assets/coastal-retreat.png",
      description: "A monolithic coastal retreat carved from pale stone, framing the horizon through deep openings and shaded outdoor rooms.",
      project_images: []
    },
    "courtyard-rooms": {
      title: "Courtyard Rooms", category: "Interior", location: "Gjakovë",
      project_year: 2023, cover_image: "assets/hero-residence.png",
      description: "An interior renovation composed as a collection of intimate rooms gathered around a private garden.",
      project_images: []
    },
    "mountain-pavilion": {
      title: "Mountain Pavilion", category: "Cultural", location: "Rugovë",
      project_year: 2019, cover_image: "assets/forest-house.png",
      description: "A compact timber and concrete pavilion designed as a sheltered threshold between the mountain landscape and community life.",
      project_images: []
    }
  };
  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);

  if (!slug) {
    root.innerHTML = '<section class="project-not-found"><h1>Project not found.</h1><a href="projects.html">Return to all projects</a></section>';
    return;
  }

  const { data: databaseProject, error } = await window.vmSupabase
    .from("projects")
    .select("*, project_images(*)")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  const project = databaseProject || fallbackProjects[slug];

  if ((error && !fallbackProjects[slug]) || !project) {
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
      <a href="projects.html"><span>All <em>projects.</em></span><i class="line-icon line-icon--large" aria-hidden="true"></i></a>
    </section>`;
})();
