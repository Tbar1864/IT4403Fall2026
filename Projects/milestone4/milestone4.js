/* Milestone 4 – Open Library Book Explorer
   jQuery AJAX for every request, Mustache.js for every piece of rendered book HTML.
   The HTML lives in the <script type="x-tmpl-mustache"> templates. */

$(function () {
  // ---------- Settings ----------
  const resultsPerPage = 10;
  const maximumResults = 50;
  const collectionSubject = "science_fiction";
  const requestTimeout = 15000;

  // ---------- App state ----------
  let searchResults = []; // the current search results, in the order returned by Open Library
  let currentPage = 1;
  let currentSearchTerm = "";
  let currentView = "grid"; // "grid" or "list"
  let collectionLoaded = false;
  let detailsRequest = null; // the in-flight details request, so a newer click can cancel it

  // Books we have already prepared, keyed by Work ID (lets the details panel reuse card data)
  const bookLookup = {};

  // ---------- Templates (read once, parsed once) ----------
  const templates = {
    card: $("#book-card-template").html(),
    pagination: $("#pagination-template").html(),
    details: $("#details-template").html(),
    loading: $("#loading-template").html(),
  };
  Object.values(templates).forEach((template) => Mustache.parse(template));

  // ---------- Element references ----------
  const $searchForm = $("#search-form");
  const $searchInput = $("#search");
  const $searchButton = $("#search-button");
  const $searchMessage = $("#search-message");
  const $resultsSummary = $("#results-summary");
  const $booksList = $("#books-list");
  const $pagination = $("#pagination");
  const $collectionList = $("#collection-list");
  const $collectionMessage = $("#collection-message");
  const $detailsSection = $("#details-section");
  const $detailsMessage = $("#details-message");
  const $detailsContent = $("#details-content");

  // ---------- Utility functions/helpers----------
  function coverUrl(coverId, size) {
    return coverId
      ? "https://covers.openlibrary.org/b/id/" + coverId + "-" + size + ".jpg"
      : "";
  }

  function authorText(authors) {
    return authors && authors.length > 0
      ? authors.join(", ")
      : "Author unknown";
  }

  function showLoading($container, count) {
    $container.html(
      Mustache.render(templates.loading, { items: new Array(count).fill({}) }),
    );
  }

  // Turns one search "doc" into the shape the card template expects
  function prepareSearchBook(doc) {
    const workId = (doc.key || "").split("/").pop();
    const book = {
      workId: workId,
      source: "search",
      title: doc.title || "Untitled book",
      authors: doc.author_name || [],
      authorText: authorText(doc.author_name),
      coverId: doc.cover_i || null,
      coverUrl: coverUrl(doc.cover_i, "M"),
      year: doc.first_publish_year || "",
      editions: doc.edition_count || "",
      languages: (doc.language || []).slice(0, 5),
    };
    bookLookup[workId] = book;
    return book;
  }

  // Turns one subject "work" into the same shape, so one template serves both sections
  function prepareCollectionBook(work) {
    const workId = (work.key || "").split("/").pop();
    const authors = (work.authors || []).map((author) => author.name);
    const book = {
      workId: workId,
      source: "collection",
      title: work.title || "Untitled book",
      authors: authors,
      authorText: authorText(authors),
      coverId: work.cover_id || null,
      coverUrl: coverUrl(work.cover_id, "M"),
      year: work.first_publish_year || "",
      editions: work.edition_count || "",
      languages: [],
    };
    bookLookup[workId] = book;
    return book;
  }

  // Replaces any cover that fails to load with the same fallback the template uses
  function attachCoverFallbacks($container) {
    $container
      .find("img.cover-image, img.details-cover-image")
      .one("error", function () {
        const label = $(this).attr("alt").replace("Cover of ", "");
        const large = $(this).hasClass("details-cover-image")
          ? " no-cover-large"
          : "";
        $(this).replaceWith(
          $("<div>", {
            class: "no-cover" + large,
            role: "img",
            "aria-label": "No cover available for " + label,
            text: "No cover available",
          }),
        );
      });
  }

  // ---------- Layout switching (Grid / List) ----------
  $(".view-btn").on("click", function () {
    currentView = $(this).data("view");
    $(".view-btn").attr("aria-pressed", "false");
    $(this).attr("aria-pressed", "true");
    // Same Mustache markup, different CSS class: no re-request, no reload
    $(".book-collection")
      .toggleClass("view-grid", currentView === "grid")
      .toggleClass("view-list", currentView === "list");
  });

  // ---------- Section tabs (Search Results / Collection) ----------
  function showTab(tabId) {
    $(".tab").each(function () {
      const isActive = this.id === tabId;
      $(this).attr({
        "aria-selected": String(isActive),
        tabindex: isActive ? "0" : "-1",
      });
      $("#" + $(this).attr("aria-controls")).prop("hidden", !isActive);
    });
    // Load the collection the first time its tab is opened (and keep it afterwards)
    if (tabId === "tab-collection" && !collectionLoaded) loadCollection();
  }

  $(".tab").on("click", function () {
    showTab(this.id);
  });

  // Arrow keys move between tabs (standard tab-list keyboard behavior)
  $(".tabs").on("keydown", ".tab", function (event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const $tabs = $(".tab");
    const next =
      ($tabs.index(this) +
        (event.key === "ArrowRight" ? 1 : -1) +
        $tabs.length) %
      $tabs.length;
    $tabs.eq(next).trigger("focus").trigger("click");
  });

  // ---------- Search ----------
  $searchForm.on("submit", function (event) {
    event.preventDefault(); // keep it a single-page app
    const term = $searchInput.val().trim();

    if (!term) {
      $searchMessage
        .text("Please enter a book title or keyword.")
        .addClass("is-error");
      $searchInput.trigger("focus");
      return;
    }

    currentSearchTerm = term;
    currentPage = 1; // a new search always starts on page 1
    showTab("tab-results");
    searchBooks(term);
  });

  function searchBooks(term) {
    $searchButton.prop("disabled", true).text("Searching...");
    $searchMessage
      .removeClass("is-error")
      .text('Searching for "' + term + '"...');
    $resultsSummary.text("Loading results...");
    $pagination.prop("hidden", true);
    showLoading($booksList, resultsPerPage);

    $.ajax({
      url: "https://openlibrary.org/search.json",
      method: "GET",
      dataType: "json",
      timeout: requestTimeout,
      data: {
        q: term,
        limit: maximumResults,
        fields:
          "key,title,author_name,cover_i,first_publish_year,edition_count,language",
      },
    })
      .done(function (data) {
        if (term !== currentSearchTerm) return; // an older search finished late
        searchResults = (data.docs || [])
          .filter((doc) => doc.key)
          .slice(0, maximumResults)
          .map(prepareSearchBook);

        if (searchResults.length === 0) {
          $booksList.html(
            '<p class="empty-state">No books matched "' +
              $("<span>").text(term).html() +
              '". Try a different title or keyword.</p>',
          );
          $resultsSummary.text("0 results");
          $searchMessage.text("");
          return;
        }

        $searchMessage.text("");
        renderPage();
      })
      .fail(function (xhr, status) {
        if (term !== currentSearchTerm) return;
        searchResults = [];
        $booksList.empty();
        $resultsSummary.text("No results to show.");
        $searchMessage
          .addClass("is-error")
          .text(
            status === "timeout"
              ? "Open Library took too long to respond. Please try again."
              : "Unable to reach Open Library right now. Please try again in a moment.",
          );
      })
      .always(function () {
        $searchButton.prop("disabled", false).text("Search");
      });
  }

  // ---------- Pagination ----------
  function renderPage() {
    const totalPages = Math.ceil(searchResults.length / resultsPerPage);
    const start = (currentPage - 1) * resultsPerPage;
    const visibleBooks = searchResults.slice(start, start + resultsPerPage);

    $booksList.html(Mustache.render(templates.card, { books: visibleBooks }));
    attachCoverFallbacks($booksList);

    $resultsSummary.text(
      "Showing " +
        (start + 1) +
        "–" +
        (start + visibleBooks.length) +
        " of " +
        searchResults.length +
        ' results for "' +
        currentSearchTerm +
        '"',
    );

    const pages = [];
    for (let number = 1; number <= totalPages; number++) {
      pages.push({ number: number, current: number === currentPage });
    }

    $pagination
      .html(
        Mustache.render(templates.pagination, {
          pages: pages,
          currentPage: currentPage,
          totalPages: totalPages,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
          prevPage: currentPage - 1,
          nextPage: currentPage + 1,
        }),
      )
      .prop("hidden", false); // shown even for one page so "Page 1 of 1" is visible
  }

  $pagination.on("click", "button[data-page]", function () {
    const page = Number($(this).data("page"));
    const totalPages = Math.ceil(searchResults.length / resultsPerPage);
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    renderPage();
    $("#results-section")[0].scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  // ---------- Predefined collection ----------
  function loadCollection() {
    collectionLoaded = true;
    $collectionMessage
      .removeClass("is-error")
      .text("Loading science fiction books...");
    showLoading($collectionList, 10);

    $.ajax({
      url: "https://openlibrary.org/subjects/" + collectionSubject + ".json",
      method: "GET",
      dataType: "json",
      timeout: requestTimeout,
      data: { limit: 10 },
    })
      .done(function (data) {
        const books = (data.works || [])
          .slice(0, 10)
          .map(prepareCollectionBook);
        if (books.length === 0) {
          $collectionList.empty();
          $collectionMessage.text("No books were found for this subject.");
          return;
        }
        $collectionList.html(Mustache.render(templates.card, { books: books }));
        attachCoverFallbacks($collectionList);
        $collectionMessage.text(
          "Showing " + books.length + " science fiction books.",
        );
      })
      .fail(function () {
        collectionLoaded = false; // allow a retry next time the tab opens
        $collectionList.empty();
        $collectionMessage
          .addClass("is-error")
          .text(
            "Unable to load the science fiction collection. Please try again later.",
          );
      });
  }

  // ---------- Details on demand ----------
  // One delegated handler works for every card, in both sections, in both views
  $(document).on("click", ".book-select", function () {
    $(".book-card").removeClass("is-selected");
    $(this).closest(".book-card").addClass("is-selected");
    loadBookDetails(String($(this).data("work-id")));
  });

  function cleanDescription(description) {
    let text =
      typeof description === "string"
        ? description
        : (description && description.value) || "";
    // Open Library descriptions sometimes include markdown links and source notes
    text = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\r/g, "")
      .split(/\n-{3,}/)[0]
      .trim();
    return text;
  }

  function loadBookDetails(workId) {
    if (!workId) return;
    const cardBook = bookLookup[workId] || {};

    if (detailsRequest) detailsRequest.abort(); // only the latest click wins
    $detailsContent.empty();
    $detailsMessage
      .removeClass("is-error")
      .text(
        "Loading details for " +
          (cardBook.title || "the selected book") +
          "...",
      );
    $detailsSection.addClass("is-loading");

    // On small screens the details panel sits below the list, so bring it into view
    if (window.matchMedia("(max-width: 959px)").matches) {
      $detailsSection[0].scrollIntoView({ behavior: "smooth", block: "start" });
    }

    detailsRequest = $.ajax({
      url:
        "https://openlibrary.org/works/" + encodeURIComponent(workId) + ".json",
      method: "GET",
      dataType: "json",
      timeout: requestTimeout,
    });

    detailsRequest
      .done(function (work) {
        const description = cleanDescription(work.description);
        const subjects = (work.subjects || []).slice(0, 10);
        const coverId =
          (work.covers || []).find((id) => id > 0) || cardBook.coverId;

        const metadata = [];
        const published = cardBook.year || work.first_publish_date;
        if (published)
          metadata.push({ label: "First published", value: published });
        if (cardBook.editions)
          metadata.push({ label: "Editions", value: cardBook.editions });
        if (cardBook.languages && cardBook.languages.length)
          metadata.push({
            label: "Languages",
            value: cardBook.languages.join(", ").toUpperCase(),
          });
        if (work.subject_places && work.subject_places.length)
          metadata.push({
            label: "Places",
            value: work.subject_places.slice(0, 3).join(", "),
          });
        if (work.subject_times && work.subject_times.length)
          metadata.push({
            label: "Time period",
            value: work.subject_times.slice(0, 2).join(", "),
          });

        const viewModel = {
          workId: workId,
          title: work.title || cardBook.title || "Untitled book",
          authorText: authorText(cardBook.authors),
          coverUrl: coverUrl(coverId, "L"),
          description:
            description || "No description is available for this book.",
          hasDescription: Boolean(description),
          subjects: subjects,
          hasSubjects: subjects.length > 0,
          metadata: metadata,
          openLibraryUrl:
            "https://openlibrary.org/works/" + encodeURIComponent(workId),
        };

        $detailsContent.html(Mustache.render(templates.details, viewModel));
        attachCoverFallbacks($detailsContent);
        $detailsMessage.text("");
      })
      .fail(function (xhr, status) {
        if (status === "abort") return; // replaced by a newer selection
        $detailsMessage
          .addClass("is-error")
          .text(
            "Unable to load details for this book. Please try another book or try again.",
          );
      })
      .always(function (data, status) {
        if (status !== "abort") $detailsSection.removeClass("is-loading");
      });
  }
  // Start loading the collection right away so its tab is ready when opened
  loadCollection();
});
