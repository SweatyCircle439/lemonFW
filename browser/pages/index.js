const matches = document.querySelectorAll('.theme-selector input[type="radio"]');
for (match in matches) {
    matches[match].onchange = function() {
        lmn.setBrowserStyleProperty("color-scheme", this.value);
    }
}
function ftpqr() {
    lmn.startFPhost();
    const image = document.createElement("img");
    image.src = `https://sweatycircle439.com/api/chart/qr?size=100x100&&text=${encodeURI(`http://${lmn.getIP()}:130`)}&&type=image`;
    document.body.appendChild(image);
}
lmn.lmntab.InnerHTML("<p>n<img class=\"tab-icon\" data-replace=\"src\" data-replaceWith=\"icon\">w tab</p>");
lmn.lmntab.css("fontSize", "40px");
lmn.lmntab.css("fontWeight", "bold");
lmn.lmntab.css("justifyContent", "center");
lmn.lmntab.css("background", "url(assets/lemonjc.png)");
lmn.lmntab.css("backgroundRepeat", "no-repeat");
lmn.lmntab.css("backgroundSize", "200%");
lmn.lmntab.css("backgroundPosition", "50% 50%");
lmn.lmntab.css("color", "white");