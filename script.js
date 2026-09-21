document.addEventListener("DOMContentLoaded", function () {
      lucide.createIcons();

      const menuToggle = document.getElementById("menu-toggle");
      const navigation = document.getElementById("site-navigation");

      menuToggle.addEventListener("click", function () {
        const isOpen = !navigation.classList.contains("hidden");
        navigation.classList.toggle("hidden", isOpen);
        menuToggle.setAttribute("aria-expanded", String(!isOpen));
      });

      navigation.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          if (window.innerWidth < 768) {
            navigation.classList.add("hidden");
            menuToggle.setAttribute("aria-expanded", "false");
          }
        });
      });

      const searchInput = document.getElementById("resource-search");
      const cards = [
        { element: document.getElementById("exercise-card"), title: "exercises" },
        { element: document.getElementById("lab-card"), title: "lab work" },
        { element: document.getElementById("project-card"), title: "projects" }
      ];
      const noResults = document.getElementById("no-results");
      const resultMessage = document.getElementById("search-result-message");

      searchInput.addEventListener("input", function () {
        const term = searchInput.value.trim().toLowerCase();
        let matches = 0;

        cards.forEach(function (card) {
          const matched = card.title.includes(term);
          card.element.classList.toggle("hidden", !matched);
          if (matched) matches += 1;
        });

        noResults.classList.toggle("hidden", matches !== 0);
        resultMessage.textContent = matches === 1 ? "1 resource shown." : `${matches} resources shown.`;
      });
    });