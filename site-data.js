(async function loadPortfolioData() {
  const client = window.vmSupabase;
  if (!client) return;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element && value !== undefined && value !== null) element.textContent = value;
  };

  const setHTML = (id, value) => {
    const element = document.getElementById(id);
    if (element && value) element.innerHTML = value;
  };

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);

  const projectCard = (project, index, archive = false) => {
    const number = String(index + 1).padStart(2, "0");
    const image = project.cover_image || "assets/hero-residence.png";
    const url = `project.html?slug=${encodeURIComponent(project.slug)}`;
    const cardClass = archive ? "archive-card reveal is-visible" : `project-card${index === 0 ? " project-card--wide" : ""} reveal is-visible`;

    return `
      <article class="${cardClass}">
        <a href="${url}" class="project-image">
          <img src="${escapeHTML(image)}" alt="${escapeHTML(project.title)}">
          <span class="project-index">${number}</span>
          <span class="project-open">View project <i class="line-icon" aria-hidden="true"></i></span>
        </a>
        <div class="project-meta">
          <h3>${escapeHTML(project.title)}</h3>
          <p>${escapeHTML(project.category || "Architecture")} · ${escapeHTML(project.location || "")}</p>
          <span>${escapeHTML(project.project_year || "")}</span>
        </div>
      </article>`;
  };

  try {
    const { data: content } = await client.from("site_content").select("section, content");
    const sections = Object.fromEntries((content || []).map((row) => [row.section, row.content]));

    if (document.body.dataset.page === "home") {
      const hero = sections.hero || {};
      const studio = sections.studio || {};
      const projectsCopy = sections.projects || {};
      const approach = sections.approach || {};
      const contact = sections.contact || {};

      setText("hero-eyebrow", hero.eyebrow);
      setHTML("hero-title", hero.title);
      setText("hero-intro", hero.intro);
      setText("hero-project-name", hero.project_name);
      setText("hero-year", hero.year);
      if (hero.image_url) document.getElementById("hero-image").src = hero.image_url;

      setText("projects-heading", projectsCopy.heading);
      setText("projects-intro", projectsCopy.intro);
      setHTML("studio-heading", studio.heading);
      setText("studio-description", studio.description);
      setText("stat-years", studio.years);
      setText("stat-projects", studio.projects);
      setText("stat-awards", studio.awards);
      setText("approach-quote", approach.quote);
      if (approach.image_url) document.getElementById("approach-image").src = approach.image_url;

      setHTML("contact-heading", contact.heading);
      setHTML("contact-address", contact.address);
      setText("contact-phone", contact.phone);
      setText("contact-email", contact.email);
      if (contact.email) document.getElementById("contact-email-link").href = `mailto:${contact.email}`;
    }

    const { data: projects, error } = await client
      .from("projects")
      .select("*")
      .eq("published", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !projects?.length) return;

    if (document.body.dataset.page === "home") {
      const featured = projects.filter((project) => project.featured).slice(0, 3);
      const selected = featured.length ? featured : projects.slice(0, 3);
      document.getElementById("featured-projects").innerHTML =
        selected.map((project, index) => projectCard(project, index)).join("");
    }

    if (document.body.dataset.page === "projects") {
      document.getElementById("all-projects-grid").innerHTML =
        projects.map((project, index) => projectCard(project, index, true)).join("");
      const count = document.querySelector(".archive-toolbar p:last-child");
      if (count) count.textContent = `${String(projects.length).padStart(2, "0")} projects`;
    }
  } catch (error) {
    console.warn("Portfolio content fallback is active.", error);
  }
})();
