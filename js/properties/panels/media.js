function buildMediaPanel(panel, data) {
    if (data.type === "video") {
        const grp = createGroup("Video Settings");
        grp.appendChild(
            createField(
                "Video Source",
                `
                <div class="flex flex-col gap-2">
                    <input type="text" id="prop-video-url" class="w-full text-xs" value="${data.content?.startsWith("data:") ? "Local File (Base64 Data)" : data.content || ""}" placeholder="https://..." ${data.content?.startsWith("data:") ? "disabled" : ""}>
                    <button onclick="document.getElementById('video-file-upload').click()" class="w-full py-1.5 px-3 bg-gray-900 border border-gray-700 rounded-lg text-[11px] text-gray-300 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                        <i class="fa-solid fa-upload text-primary"></i> ${data.content?.startsWith("data:") ? "Change Local File" : "Upload Local File"}
                    </button>
                    ${
                        data.content?.startsWith("data:")
                            ? `
                        <button id="prop-video-clear-local" class="text-xs text-primary hover:text-primary-hover transition-colors flex items-center gap-1 mt-1">
                            <i class="fa-solid fa-link"></i> Switch to URL source
                        </button>
                    `
                            : ""
                    }
                </div>
            `,
            ),
        );

        const checksWrap = document.createElement("div");
        checksWrap.className = "space-y-2 mt-2";
        checksWrap.innerHTML = `
            <label class="flex items-center gap-2 cursor-pointer group/chk">
                <input type="checkbox" id="prop-video-mute" ${data.muted ? "checked" : ""} class="hidden">
                <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                    <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${data.muted ? "opacity-100" : "opacity-0"}"></div>
                </div>
                <span class="text-xs text-gray-400">Muted</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer group/chk">
                <input type="checkbox" id="prop-video-autoplay" ${data.autoplay ? "checked" : ""} class="hidden">
                <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                    <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${data.autoplay ? "opacity-100" : "opacity-0"}"></div>
                </div>
                <span class="text-xs text-gray-400">Autoplay</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer group/chk">
                <input type="checkbox" id="prop-video-loop" ${data.loop ? "checked" : ""} class="hidden">
                <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                    <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${data.loop ? "opacity-100" : "opacity-0"}"></div>
                </div>
                <span class="text-xs text-gray-400">Loop</span>
            </label>
        `;
        grp.appendChild(checksWrap);
        panel.appendChild(grp);
    }

    if (data.type === "image") {
        const imgGrp = createGroup("Image");
        imgGrp.appendChild(
            createField("URL", `<input type="text" id="prop-img" class="w-full" value="${data.content || ""}">`),
        );
        imgGrp.innerHTML += `
            <div class="flex gap-2 mt-2">
                <div class="flex-1 flex flex-col gap-1">
                    <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Width</label>
                    <input type="number" id="prop-img-w" class="w-full text-xs" value="${parseFloat(data.width) || 0}">
                </div>
                <div class="flex-1 flex flex-col gap-1">
                    <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Height</label>
                    <input type="number" id="prop-img-h" class="w-full text-xs" value="${parseFloat(data.height) || 0}">
                </div>
            </div>
            <label class="flex items-center gap-2 cursor-pointer group/chk mt-3 mb-2">
                <input type="checkbox" id="prop-img-lock-aspect" ${data.lockAspectRatio ? "checked" : ""} class="aspect-lock-checkbox prop-native-checkbox">
                <span class="text-xs text-gray-400">Lock Aspect Ratio</span>
            </label>
            <div class="h-px bg-gray-800 my-3"></div>
            <p class="text-[11px] text-gray-500 leading-relaxed">
                Crop mode lets you drag the image area and trim with the edge handles.
            </p>
            <div class="flex gap-2 mt-2">
                <button id="prop-crop" class="flex-1 py-2 rounded bg-gray-800 text-xs" onclick="enterCropMode('${data.id}')">CROP IMAGE</button>
                <button id="prop-crop-reset" class="flex-1 py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-300">RESET CROP</button>
            </div>
        `;
        panel.appendChild(imgGrp);
    }
}
