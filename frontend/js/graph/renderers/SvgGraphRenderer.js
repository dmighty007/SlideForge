import { renderDocumentToSvg } from "../../mermaid/mermaid-document.js";

export class SvgGraphRenderer {
    static render(document = {}, options = {}) {
        return renderDocumentToSvg(document, document.styles || options.style || {}, {
            selectedIds: options.selectedIds || [],
            viewport: options.viewport || null,
            showConnectHandles: options.showConnectHandles === true,
            showResizeHandles: options.showResizeHandles === true,
        });
    }
}
