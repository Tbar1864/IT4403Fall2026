const resultsPerPage = 10;
const maximumResults = 60;

let currentSearch = "";

const booksList = document.getElementById("books-list");
const searchMessage = document.getElementById("search-message");
const pagination = document.getElementById("pagination");
const pageSelect = document.getElementById("page-select");

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

async function loadPage(page) {
  booksList.replaceChildren();
  searchMessage.textContent = "Loading books...";
  pageSelect.disabled = true;

  const apiUrl =
    "https://openlibrary.org/search.json?q=" +
    encodeURIComponent(currentSearch) +
    "&limit=" +
    resultsPerPage +
    "&page=" +
    page;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Request failed: " + response.status);
    }

    const data = await response.json();

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
      const titleLink = document.createElement("a");

      titleLink.href = "bookdetails.html?workId=" + encodeURIComponent(workId);

      titleLink.textContent = book.title || "Untitled book";

      titleHeading.appendChild(titleLink);

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
