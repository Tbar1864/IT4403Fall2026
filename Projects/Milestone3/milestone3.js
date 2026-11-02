const resultsPerPage = 10;
const maximumResults = 60;

let currentSearch = "";

const booksList = document.getElementById("books-list");
const searchMessage = document.getElementById("search-message");
const pagination = document.getElementById("pagination");
const pageSelect = document.getElementById("page-select");

function getBooks() {
  //Your existing search-input validation
}

pageSelect.addEventListener("change", function () {
  loadPage(Number(pageSelect.value));
});
