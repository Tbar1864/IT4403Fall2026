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
  }
}
