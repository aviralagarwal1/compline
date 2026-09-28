(function () {
  function clearExpenseSessionStorage() {
    sessionStorage.removeItem("compline_token");
    sessionStorage.removeItem("compline_refresh_token");
    sessionStorage.removeItem("compline_name");
  }

  window.clearExpenseSessionStorage = clearExpenseSessionStorage;
  window.doLogout = function doLogout() {
    clearExpenseSessionStorage();
    window.location.href = "/app";
  };
})();
