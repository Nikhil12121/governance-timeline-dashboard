"""LLM service for governance summary generation."""

from __future__ import annotations

from typing import Any

from .llm_service import LLMServiceError, _build_client, _get_model_name
from .prompt_templates import build_summary_prompt


def _normalize_text(value: Any) -> str:
    return " ".join(str(value or "").replace("\r", "\n").split()).strip()


def _normalize_timeline_tasks(tasks: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for task in tasks or []:
        if not isinstance(task, dict):
            continue
        normalized.append(
            {
                "name": _normalize_text(task.get("name", "")),
                "start": str(task.get("start", "")).strip(),
                "end": str(task.get("end", "")).strip(),
                "type": _normalize_text(task.get("type", "")),
                "phase": _normalize_text(task.get("phase", "")),
                "manual_context": str(task.get("manualContext", "") or task.get("manual_context", "")).strip(),
                "is_critical": bool(task.get("isCritical", False)),
            }
        )
    return normalized


def _normalize_financial_rows(rows: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        values = row.get("values", [])
        normalized.append(
            {
                "label": _normalize_text(row.get("label", "")),
                "values": [str(value).strip() for value in values] if isinstance(values, list) else [],
            }
        )
    return normalized


def generate_governance_summary(payload: dict[str, Any]) -> str:
    prompt = build_summary_prompt(
        {
            "project_name": _normalize_text(payload.get("project_name", "")),
            "project_id": _normalize_text(payload.get("project_id", "")),
            "timeline_title": _normalize_text(payload.get("timeline_title", "")),
            "timeline_tasks": _normalize_timeline_tasks(payload.get("timeline_tasks")),
            "financial_year_headers": [
                _normalize_text(header) for header in payload.get("financial_year_headers", []) or []
            ],
            "financial_rows": _normalize_financial_rows(payload.get("financial_rows")),
        }
    )

    try:
        client = _build_client()
        response = client.responses.create(
            model=_get_model_name(),
            input=prompt,
            max_output_tokens=500,
        )
    except Exception as exc:
        raise LLMServiceError("LLM request failed while generating governance summary.") from exc

    response_text = getattr(response, "output_text", "") or ""
    summary = response_text.strip()
    if not summary:
        raise LLMServiceError("LLM returned an empty summary.")
    return summary
