import re
import json

def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"\w+", (text or "").lower()))

def _figure_match_score(text: str, figure: dict) -> float:
    text_tokens = _tokenize(text)
    caption_tokens = _tokenize(figure.get("caption", ""))
    finding_tokens = _tokenize(figure.get("vision", {}).get("key_finding", ""))
    fig_tokens = caption_tokens | finding_tokens
    if not text_tokens or not fig_tokens:
        return 0.0
    overlap = len(text_tokens & fig_tokens)
    return overlap / max(1, min(len(text_tokens), len(fig_tokens)))

def _serialize_figure(f: dict) -> dict:
    return {
        "id": f["id"],
        "caption": f.get("caption", ""),
        "finding": f.get("vision", {}).get("key_finding", ""),
        "type": f.get("vision", {}).get("figure_type", ""),
        "path": f.get("path")
    }

def _slide_content_text(title: str, points: list[dict]) -> str:
    content = [title]
    for p in points:
        content.append(p.get("heading", ""))
        content.extend(p.get("content", []))
    return " ".join(content)

def _rank_figures_for_text(text: str, figures: list[dict], limit: int = 3) -> list[dict]:
    ranked = sorted(
        figures,
        key=lambda figure: _figure_match_score(text, figure),
        reverse=True,
    )
    return ranked[: min(limit, len(ranked))]

def _assign_figures_to_slides(slides: list[dict], candidate_figures: list[dict]) -> dict[int, list[str]]:
    if not slides or not candidate_figures:
        return {}

    slide_texts = {
        idx: _slide_content_text(slide.get("title", ""), slide.get("points", [])) for idx, slide in enumerate(slides)
    }
    all_pairs = []
    for idx, slide_text in slide_texts.items():
        for figure in candidate_figures:
            all_pairs.append((idx, figure["id"], _figure_match_score(slide_text, figure)))
    all_pairs.sort(key=lambda item: item[2], reverse=True)

    assignments = {idx: [] for idx in range(len(slides))}
    figure_use_counts = {figure["id"]: 0 for figure in candidate_figures}

    for idx, slide in enumerate(slides):
        fids = slide.get("fig_ids", [])
        if not fids and slide.get("fig_id"):
            fids = [slide.get("fig_id")]
        for fid in fids:
            if fid and fid in figure_use_counts:
                if fid not in assignments[idx]:
                    assignments[idx].append(fid)
                    figure_use_counts[fid] += 1

    for idx, figure_id, score in all_pairs:
        if assignments[idx] or figure_use_counts[figure_id] > 0:
            continue
        if score < 0.08:
            continue
        assignments[idx].append(figure_id)
        figure_use_counts[figure_id] += 1

    for idx, figure_id, score in all_pairs:
        if len(assignments[idx]) >= 2:
            continue
        if figure_id in assignments[idx]:
            continue
        if figure_use_counts[figure_id] >= 2:
            continue
        if score < 0.16:
            continue
        assignments[idx].append(figure_id)
        figure_use_counts[figure_id] += 1

    return assignments

def _rank_equations_for_text(text: str, equations: list[dict], limit: int = 3) -> list[dict]:
    def _equation_text(entry: dict) -> str:
        return " ".join(part for part in [entry.get("label", ""), entry.get("latex", ""), entry.get("text", "")] if part)

    def _equation_match_score(slide_text: str, equation: dict) -> float:
        equation_tokens = _tokenize(_equation_text(equation))
        slide_tokens = _tokenize(slide_text)
        if not slide_tokens or not equation_tokens:
            return 0.0
        overlap = len(slide_tokens & equation_tokens)
        return overlap / max(1, min(len(slide_tokens), len(equation_tokens)))

    ranked = sorted(equations, key=lambda equation: _equation_match_score(text, equation), reverse=True)
    return ranked[: min(limit, len(ranked))]

def _serialize_equation(entry: dict) -> dict:
    return {
        "page": entry.get("page"),
        "label": entry.get("label", ""),
        "latex": entry.get("latex", ""),
        "text": entry.get("text", ""),
        "path": entry.get("path"),
    }
