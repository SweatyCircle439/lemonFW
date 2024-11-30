let currentpage = "start";

function changePage(page) {
    document.getElementById(currentpage).classList.remove("currentpage");
    document.getElementById(page).classList.add("currentpage");
    currentpage = page;
}

let domcontentloaded = false;

let nonloadedprog = "";

window.addEventListener("DOMContentLoaded", () => {
    domcontentloaded = true;
    if (prog == "fns") {
        return changePage("proceed");
    }
    document.getElementById("progress").innerText = nonloadedprog;
});

window.setprogresschangelistener(prog => {
    if (prog == "fns") {
        return changePage("proceed");
    }
    if (domcontentloaded) {
        document.getElementById("progress").innerText = prog;
    }else {
        nonloadedprog = prog;
    }}
);