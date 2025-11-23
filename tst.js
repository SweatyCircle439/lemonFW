if (name[0].val == "script") {
    name.push({col: "var(--ET-element-EST)", val: `{ ${element.lang === "nodeJS" ? "\" : "\"} ${element.lang === "nodeJS" ? "node.js" : element.lang ? element.lang : "javascript"} } `});
    if (element.type) {
        name.push({col: "var(--ET-element-EST)", val: `[${element.type}]`});
    }
}