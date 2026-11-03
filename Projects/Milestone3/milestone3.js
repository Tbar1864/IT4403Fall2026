const resultsPerPage = 10;
const maximumResults = 50;

let currentSearch = "";

const booksList = document.getElementById("books-list");
const searchMessage = document.getElementById("search-message");
const pagination = document.getElementById("pagination");
const pageSelect = document.getElementById("page-select");
const searchButton = document.getElementById("search-button");

function getBooks() {
  currentSearch = document.getElementById("search").value.trim();

  booksList.replaceChildren();
  pagination.hidden = true;

  if (!currentSearch) {
    searchMessage.textContent = "Please enter a book title or keyword.";
    return;
  }

  loadPage(1);
}

pageSelect.addEventListener("change", function () {
  loadPage(Number(pageSelect.value));
});

document
  .getElementById("search-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    getBooks();
  });

async function loadPage(page) {
  booksList.replaceChildren();
  searchMessage.textContent = "Loading books...";
  pageSelect.disabled = true;
  searchButton.disabled = true;

  const apiUrl =
    "https://openlibrary.org/search.json?q=" +
    encodeURIComponent(currentSearch) +
    "&limit=" +
    resultsPerPage +
    "&page=" +
    page;

  try {
    const data = await $.ajax({
      url: apiUrl,
      method: "GET",
      dataType: "json",
      timeout: 15000,
    });

    const totalResults = Math.min(data.numFound, maximumResults);
    const totalPages = Math.ceil(totalResults / resultsPerPage);

    if (totalResults === 0) {
      searchMessage.textContent = "No books found. Try another search.";
      pagination.hidden = true;
      return;
    }

    pageSelect.replaceChildren();

    for (let number = 1; number <= totalPages; number++) {
      const option = document.createElement("option");
      option.value = number;
      option.textContent = "Page " + number;
      pageSelect.appendChild(option);
    }

    pageSelect.value = String(page);
    pagination.hidden = false;

    data.docs.forEach((book) => {
      const bookCard = document.createElement("article");
      bookCard.className = "book-card";

      const coverContainer = document.createElement("div");
      coverContainer.className = "cover-container";

      if (book.cover_i) {
        const cover = document.createElement("img");

        cover.src = `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg?default=false`;

        cover.alt = "Cover of " + (book.title || "selected book");
        cover.className = "cover-image";

        cover.addEventListener("error", function () {
          const fallback = document.createElement("p");
          fallback.className = "no-cover";
          fallback.textContent = "No cover available.";

          cover.replaceWith(fallback);
        });

        coverContainer.appendChild(cover);
      } else {
        const fallback = document.createElement("p");
        fallback.className = "no-cover";
        fallback.textContent = "No cover available.";

        coverContainer.appendChild(fallback);
      }

      const workId = book.key.split("/").pop();

      const titleHeading = document.createElement("h3");
      const titleButton = document.createElement("button");

      titleButton.type = "button";
      titleButton.className = "book-title-button";
      titleButton.textContent = book.title || "Untitled book";

      titleButton.addEventListener("click", function () {
        loadBookDetails(workId, book.author_name || []);
      });

      titleHeading.appendChild(titleButton);

      bookCard.appendChild(coverContainer);
      bookCard.appendChild(titleHeading);

      booksList.appendChild(bookCard);
    });
    searchMessage.textContent = `Page ${page} of ${totalPages}. Showing up to ${totalResults} results.`;
  } catch (error) {
    console.error("Error fetching books:", error);
    searchMessage.textContent = "Unable to load books. Please try again.";
    pagination.hidden = true;
  } finally {
    pageSelect.disabled = false;
    searchButton.disabled = false;
  }
}
const detailsMessage = document.getElementById("details-message");
const detailsContainer = document.getElementById("details-content");

let detailsRequestId = 0;

async function loadBookDetails(workId, authors = []) {
  const requestId = ++detailsRequestId;
  detailsContainer.replaceChildren();
  document
    .getElementById("details-section")
    .scrollIntoView({ behavior: "smooth" });

  if (!workId) {
    detailsMessage.textContent = "No book selected.";
    return;
  }

  detailsMessage.textContent = "Loading book details...";

  try {
    const book = await $.ajax({
      url:
        "https://openlibrary.org/works/" + encodeURIComponent(workId) + ".json",
      method: "GET",
      dataType: "json",
      timeout: 15000,
    });

    if (requestId !== detailsRequestId) return;

    const title = document.createElement("h3");
    title.textContent = book.title || "Untitled book";
    detailsContainer.appendChild(title);

    const idParagraph = document.createElement("p");
    idParagraph.textContent = "Work ID: " + workId;
    detailsContainer.appendChild(idParagraph);

    const authorParagraph = document.createElement("p");
    authorParagraph.textContent =
      "Author(s): " +
      (authors.length > 0 ? authors.join(", ") : "Unknown author");
    detailsContainer.appendChild(authorParagraph);

    const coverId = book.covers?.find((id) => id > 0);

    if (coverId) {
      const cover = document.createElement("img");
      cover.src = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg?default=false`;
      cover.alt = "Cover of " + (book.title || "selected book");
      cover.className = "cover-image";

      cover.addEventListener("error", function () {
        const fallback = document.createElement("p");
        fallback.className = "no-cover";
        fallback.textContent = "No cover available.";
        cover.replaceWith(fallback);
      });

      detailsContainer.appendChild(cover);
    } else {
      const fallback = document.createElement("p");
      fallback.className = "no-cover";
      fallback.textContent = "No cover available.";
      detailsContainer.appendChild(fallback);
    }

    const descriptionHeading = document.createElement("h3");
    descriptionHeading.textContent = "Description";
    detailsContainer.appendChild(descriptionHeading);

    const description = document.createElement("p");
    description.textContent =
      typeof book.description === "string"
        ? book.description
        : book.description?.value || "No description available.";
    detailsContainer.appendChild(description);

    const subjectsHeading = document.createElement("h3");
    subjectsHeading.textContent = "Subjects";
    detailsContainer.appendChild(subjectsHeading);

    if (book.subjects && book.subjects.length > 0) {
      const subjectsList = document.createElement("ul");
      book.subjects.slice(0, 10).forEach((subject) => {
        const item = document.createElement("li");
        item.textContent = subject;
        subjectsList.appendChild(item);
      });
      detailsContainer.appendChild(subjectsList);
    } else {
      const fallback = document.createElement("p");
      fallback.textContent = "No subjects available.";
      detailsContainer.appendChild(fallback);
    }

    const linkParagraph = document.createElement("p");
    const libraryLink = document.createElement("a");
    libraryLink.href =
      "https://openlibrary.org/works/" + encodeURIComponent(workId);
    libraryLink.textContent = "View this book on Open Library";
    linkParagraph.appendChild(libraryLink);
    detailsContainer.appendChild(linkParagraph);

    detailsMessage.textContent = "";
  } catch (error) {
    if (requestId !== detailsRequestId) return;
    console.error("Error loading book details:", error);
    detailsMessage.textContent = "Unable to load this book. Please try again.";
  }
  const collectionSubject = "science_fiction";
  const collectionList = document.getElementById("collection-list");
  const collectionMessage = document.getElementById("collection-message");

  async function loadCollection() {
    collectionList.replaceChildren();
    collectionMessage.textContent = "Loading collection...";

    try {
      const data = await $.ajax({
        url:
          "https://openlibrary.org/subjects/" +
          collectionSubject +
          ".json?limit=10",
        method: "GET",
        dataType: "json",
        timeout: 15000,
      });

      const works = data.works || [];

      if (works.length === 0) {
        collectionMessage.textContent = "No books found in this collection.";
        return;
      }

      works.forEach((work) => {
        const workId = work.key.split("/").pop();
        const authors = (work.authors || []).map((author) => author.name);

        const bookCard = document.createElement("article");
        bookCard.className = "book-card";

        const coverContainer = document.createElement("div");
        coverContainer.className = "cover-container";

        if (work.cover_id) {
          const cover = document.createElement("img");
          cover.src = `https://covers.openlibrary.org/b/id/${work.cover_id}-S.jpg?default=false`;
          cover.alt = "Cover of " + (work.title || "selected book");
          cover.className = "cover-image";

          cover.addEventListener("error", function () {
            const fallback = document.createElement("p");
            fallback.className = "no-cover";
            fallback.textContent = "No cover available.";
            cover.replaceWith(fallback);
          });

          coverContainer.appendChild(cover);
        } else {
          const fallback = document.createElement("p");
          fallback.className = "no-cover";
          fallback.textContent = "No cover available.";
          coverContainer.appendChild(fallback);
        }

        const titleHeading = document.createElement("h3");
        const titleButton = document.createElement("button");

        titleButton.type = "button";
        titleButton.className = "book-title-button";
        titleButton.textContent = work.title || "Untitled book";

        titleButton.addEventListener("click", function () {
          loadBookDetails(workId, authors);
        });

        titleHeading.appendChild(titleButton);

        bookCard.appendChild(coverContainer);
        bookCard.appendChild(titleHeading);

        collectionList.appendChild(bookCard);
      });

      collectionMessage.textContent = "Showing " + works.length + " books.";
    } catch (error) {
      console.error("Error loading collection:", error);
      collectionMessage.textContent =
        "Unable to load the collection. Please try again later.";
    }
  }

  loadCollection();
}
