function toPxNumber(value) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 0;
}

function isTextAutoHeightEnabled(data, dom) {
    if (data && typeof data.autoHeight === "boolean") return data.autoHeight;
    if (dom?.dataset?.autoHeight) return dom.dataset.autoHeight !== "false";
    return true;
}

function syncTextBoxLayout(dom, data = null) {
    if (!dom || dom.getAttribute("data-type") !== "text") return null;
    const contentHost = dom.querySelector(".text-element-content");
    if (!contentHost) return null;

    const autoHeight = isTextAutoHeightEnabled(data, dom);
    dom.dataset.autoHeight = autoHeight ? "true" : "false";

    if (!autoHeight) {
        contentHost.style.height = "100%";
        return {
            autoHeight,
            height: toPxNumber(dom.style.height),
        };
    }

    const computed = window.getComputedStyle(dom);
    const verticalInsets =
        toPxNumber(computed.paddingTop) +
        toPxNumber(computed.paddingBottom) +
        toPxNumber(computed.borderTopWidth) +
        toPxNumber(computed.borderBottomWidth);
    const minHeight = Math.max(40, verticalInsets + 24);

    const previousHeight = dom.style.height;
    const previousHostHeight = contentHost.style.height;
    dom.style.height = "auto";
    contentHost.style.height = "auto";

    const measured = Math.max(minHeight, Math.ceil(contentHost.scrollHeight + verticalInsets));
    dom.style.height = `${measured}px`;
    contentHost.style.height = "";

    return {
        autoHeight,
        height: measured,
        previousHeight,
        previousHostHeight,
    };
}
