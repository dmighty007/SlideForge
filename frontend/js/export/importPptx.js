/**
 * importPptx.js
 * Client-side parser for importing .pptx files into SlideForge using JSZip.
 */

async function importPptx(file) {
    if (!window.JSZip) {
        console.error("JSZip is not loaded.");
        alert("Cannot import PPTX because JSZip is missing.");
        return;
    }

    try {
        setProjectSaveHint?.("Reading PPTX...", "muted");
        const zip = await JSZip.loadAsync(file);
        
        // 1. Read presentation.xml to get the ordered slide IDs
        const presXmlString = await zip.file("ppt/presentation.xml").async("string");
        const parser = new DOMParser();
        const presDoc = parser.parseFromString(presXmlString, "text/xml");
        
        // Extract Slide Size
        let slideWidth = 1024;
        let slideHeight = 768;
        const sldSz = presDoc.getElementsByTagName("p:sldSz")[0];
        if (sldSz) {
            const cx = parseInt(sldSz.getAttribute("cx") || "0", 10);
            const cy = parseInt(sldSz.getAttribute("cy") || "0", 10);
            if (cx && cy) {
                slideWidth = Math.round(cx / 9525);
                slideHeight = Math.round(cy / 9525);
            }
        }
        // Fallback or scale to SlideForge's typical 1024x768
        const scaleX = 1024 / slideWidth;
        const scaleY = 768 / slideHeight;

        // Get slide order
        const sldIdLst = presDoc.getElementsByTagName("p:sldIdLst")[0];
        if (!sldIdLst) {
            throw new Error("No slides found in presentation.xml");
        }
        
        const sldIds = Array.from(sldIdLst.getElementsByTagName("p:sldId")).map(node => {
            return node.getAttribute("r:id");
        });

        // 2. Read presentation.xml.rels to map rId to actual files
        const presRelsString = await zip.file("ppt/_rels/presentation.xml.rels").async("string");
        const presRelsDoc = parser.parseFromString(presRelsString, "text/xml");
        
        const relNodes = Array.from(presRelsDoc.getElementsByTagName("Relationship"));
        const relMap = {};
        relNodes.forEach(node => {
            relMap[node.getAttribute("Id")] = node.getAttribute("Target"); // e.g. "slides/slide1.xml"
        });

        // 3. Extract each slide
        const newSlides = [];
        
        for (let i = 0; i < sldIds.length; i++) {
            const rId = sldIds[i];
            const target = relMap[rId];
            if (!target) continue;
            
            // target could be "slides/slide1.xml" or "/ppt/slides/slide1.xml"
            let slidePath = target;
            if (slidePath.startsWith("/")) {
                slidePath = slidePath.substring(1);
            } else if (!slidePath.startsWith("ppt/")) {
                slidePath = "ppt/" + slidePath;
            }
            
            const slideFile = zip.file(slidePath);
            if (!slideFile) continue;
            
            const slideXmlString = await slideFile.async("string");
            const slideDoc = parser.parseFromString(slideXmlString, "text/xml");
            
            const newSlide = {
                id: typeof generateId === "function" ? generateId("slide") : "slide_" + Date.now() + "_" + i,
                layoutId: "blank",
                masterId: "none",
                notes: "",
                elements: []
            };
            
            // Extract shapes <p:sp>
            const shapes = Array.from(slideDoc.getElementsByTagName("p:sp"));
            shapes.forEach((sp, spIndex) => {
                // Extract Text
                const texts = Array.from(sp.getElementsByTagName("a:t")).map(t => t.textContent).join(" ");
                if (!texts || texts.trim() === "") return; // Ignore empty shapes
                
                // Extract Bounds
                let x = 100, y = 100, w = 300, h = 100;
                const spPr = sp.getElementsByTagName("p:spPr")[0];
                if (spPr) {
                    const xfrm = spPr.getElementsByTagName("a:xfrm")[0];
                    if (xfrm) {
                        const off = xfrm.getElementsByTagName("a:off")[0];
                        const ext = xfrm.getElementsByTagName("a:ext")[0];
                        if (off) {
                            x = Math.round(parseInt(off.getAttribute("x") || "0", 10) / 9525 * scaleX);
                            y = Math.round(parseInt(off.getAttribute("y") || "0", 10) / 9525 * scaleY);
                        }
                        if (ext) {
                            w = Math.round(parseInt(ext.getAttribute("cx") || "0", 10) / 9525 * scaleX);
                            h = Math.round(parseInt(ext.getAttribute("cy") || "0", 10) / 9525 * scaleY);
                        }
                    }
                }
                
                const element = {
                    id: typeof generateId === "function" ? generateId("el") : "el_" + Date.now() + "_" + spIndex,
                    type: "text",
                    x: x,
                    y: y,
                    width: w + "px",
                    height: h + "px",
                    content: texts,
                    autoHeight: false,
                    textFitMode: "fixed",
                    styles: {
                        color: "#172033",
                        fontSize: "24px",
                        fontFamily: '"Manrope", sans-serif',
                        textAlign: "left",
                        zIndex: spIndex + 1
                    }
                };
                newSlide.elements.push(element);
            });
            
            // Just push the slide even if empty
            newSlides.push(newSlide);
        }
        
        if (newSlides.length === 0) {
            alert("Could not extract any slides from this PPTX.");
            return;
        }
        
        // 4. Update Application State
        if (typeof state !== "undefined") {
            saveStateToUndo?.();
            state.slides = newSlides;
            if (typeof currentSlideIndex !== "undefined") {
                setCurrentSlideIndex(0);
            }
            if (typeof clearSelection === "function") clearSelection();
            if (typeof renderSlidesFromState === "function") renderSlidesFromState();
            if (typeof updateSlideCounter === "function") updateSlideCounter();
            if (typeof Reveal !== "undefined" && typeof Reveal.slide === "function") {
                Reveal.slide(0);
            }
            setProjectSaveHint?.("Imported PPTX successfully!", "success");
        }
        
    } catch (err) {
        console.error("PPTX Import Error:", err);
        alert("Failed to import PPTX: " + err.message);
        setProjectSaveHint?.("Import failed", "danger");
    }
}
