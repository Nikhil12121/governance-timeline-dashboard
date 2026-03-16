"""LLM service layer for governance consultation polishing."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from dotenv import load_dotenv
from openai import AzureOpenAI

from .prompt_templates import build_polish_prompt

# Load .env from project root (parent of backend_llm)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")


SECTION_NAMES = ("for_decision", "for_input", "for_awareness")
INTRO_BY_SECTION = {
    "for_decision": "for_decision_intro",
    "for_input": "for_input_intro",
    "for_awareness": "for_awareness_intro",
}
DEFAULT_INTROS = {
    "for_decision_intro": "Does the board approve/endorse:",
    "for_input_intro": "Team seeks input on:",
    "for_awareness_intro": "Team is sharing for awareness:",
}


class LLMServiceError(RuntimeError):
    """Raised when the LLM service cannot return a valid result."""


def _get_required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise LLMServiceError(
            f"Missing required environment variable: {name}. "
            "Set Azure OpenAI credentials before starting the API."
        )
    return value


def _normalize_azure_endpoint(endpoint: str) -> str:
    parsed = urlparse(endpoint)
    if not parsed.scheme or not parsed.netloc:
        return endpoint
    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def _build_client() -> AzureOpenAI:
    endpoint = _normalize_azure_endpoint(_get_required_env("AZURE_OPENAI_ENDPOINT"))
    api_key = _get_required_env("AZURE_OPENAI_API_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-03-01-preview").strip()
    timeout = float(os.getenv("AZURE_OPENAI_TIMEOUT", "180").strip())

    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version,
        timeout=timeout,
    )


def _get_model_name() -> str:
    return _get_required_env("AZURE_OPENAI_DEPLOYMENT")


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\r", "\n")).strip()


def _normalize_list(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = re.sub(r"^\s*(?:[-*]|\d+[.)])\s*", "", str(value)).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)
        if not cleaned:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result


def _extract_json_block(text: str) -> str:
    cleaned = text.strip()
    fenced_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", cleaned, re.DOTALL)
    if fenced_match:
        return fenced_match.group(1).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


def _empty_result() -> dict[str, Any]:
    return {
        "for_decision_intro": "",
        "for_decision": [],
        "for_input_intro": "",
        "for_input": [],
        "for_awareness_intro": "",
        "for_awareness": [],
    }


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = {
        "board_name": _normalize_text(str(payload.get("board_name", ""))),
        "project_name": _normalize_text(str(payload.get("project_name", ""))),
        "project_date": _normalize_text(str(payload.get("project_date", ""))),
        "owner": _normalize_text(str(payload.get("owner", ""))),
    }

    for section in SECTION_NAMES:
        raw_values = payload.get(section, [])
        if raw_values is None:
            values: list[str] = []
        elif isinstance(raw_values, list):
            values = [_normalize_text(str(item)) for item in raw_values if _normalize_text(str(item))]
        elif isinstance(raw_values, str):
            values = [_normalize_text(raw_values)] if _normalize_text(raw_values) else []
        else:
            raise ValueError(f"{section} must be a list of strings.")
        normalized[section] = values

    return normalized


def _has_any_input(payload: dict[str, Any]) -> bool:
    return any(payload.get(section) for section in SECTION_NAMES)


def _parse_model_output(response_text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(_extract_json_block(response_text))
    except json.JSONDecodeError as exc:
        raise LLMServiceError("LLM response was not valid JSON.") from exc

    result = _empty_result()
    for section in SECTION_NAMES:
        intro_key = INTRO_BY_SECTION[section]
        intro_value = parsed.get(intro_key, "")
        result[intro_key] = _normalize_text(str(intro_value)) if intro_value else ""

        section_value = parsed.get(section, [])
        if isinstance(section_value, list):
            result[section] = _normalize_list([str(item) for item in section_value])
        elif isinstance(section_value, str):
            result[section] = _normalize_list(section_value.splitlines())
        else:
            result[section] = []

    return result


def _apply_empty_section_defaults(
    llm_result: dict[str, Any], input_payload: dict[str, Any]
) -> dict[str, Any]:
    for section in SECTION_NAMES:
        intro_key = INTRO_BY_SECTION[section]
        if not input_payload.get(section):
            llm_result[section] = []
            llm_result[intro_key] = ""
        elif not llm_result.get(intro_key):
            llm_result[intro_key] = DEFAULT_INTROS[intro_key]
    return llm_result


def polish_consultation(payload: dict[str, Any]) -> dict[str, Any]:
    normalized_payload = _normalize_payload(payload)
    if not _has_any_input(normalized_payload):
        return _empty_result()

    prompt = build_polish_prompt(normalized_payload)

    try:
        client = _build_client()
        response = client.responses.create(
            model=_get_model_name(),
            input=prompt,
            max_output_tokens=700,
        )
    except Exception as exc:
        raise LLMServiceError("LLM request failed while polishing consultation text.") from exc

    response_text = getattr(response, "output_text", "") or ""
    if not response_text.strip():
        raise LLMServiceError("LLM returned an empty response.")

    parsed = _parse_model_output(response_text)
    return _apply_empty_section_defaults(parsed, normalized_payload)
