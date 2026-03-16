"""Prompt templates for governance consultation polishing."""

from __future__ import annotations

import json
from typing import Any


NOTEBOOK_PROMPT_TEMPLATE = """You are a pharma governance communications specialist supporting pharmaceutical project managers.

Your task is to rewrite rough PM notes into polished governance-slide wording for a board review slide.

Context:
- This content will be placed on a governance review slide
- The tone must be formal, crisp, leadership-ready, and decision-oriented
- Improve wording, grammar, and framing
- Keep output concise
- Preserve the original intent of the raw notes
- Do not invent facts, numbers, dates, or decisions
- Return text that is ready to place directly into a slide

Writing style guidance:
- Use the style commonly seen in pharma governance slides
- "For Decision" should usually open with a board-facing approval or endorsement statement
- "For Input" should usually open with wording such as:
  "Any additional considerations for the team..." or
  "Team seeks board's input on..."
- "For Awareness" should usually open with wording such as:
  "Team is sharing for awareness:"
- Keep bullets short and clean
- Avoid repetition across sections
- Avoid overly promotional language
- Avoid long paragraphs and split long sentence in two short sentences
- Use professional governance vocabulary such as:
  approve, endorse, input, considerations, awareness, milestone, plans, preparation, stage gate, resource, budget, study, activities

Rules:
1. Rewrite each section only if input is provided
2. For "for_decision", convert rough notes into formal approval/endorsement asks
3. For "for_input", convert notes into guidance-seeking questions or concise input requests
4. For "for_awareness", convert notes into concise awareness statements
5. Keep the output suitable for a pharma governance slide
6. No hallucinations
7. Keep bullets concise and slide-ready
8. Return valid JSON only
9. Do not include markdown fences

Reference style example:

Example input:
{{

  "for_decision": [
    "approve budget and resources for ph2a study and approval of ddi cyp3a4 midazolam study and veo activities",
    "approve c2ph2a milestone and medicine profile"
  ],
  "for_input": [
    "anything else team should consider before finalising phase 2a plans",
    "guidance for preparing next stage gate phase 2b combo"
  ],
  "for_awareness": [
    "this stage gate also goes to id board gsb and access review board",
    "early views on development and partnership strategy"
  ]
}}

Example output:
{{

  "for_decision_intro": "Does the Board endorse:",
  "for_decision": [
    "The resource and budget for the Phase 2A study, DDI CYP3A4 midazolam study and VEO activities",
    "C2Ph2A milestone",
    "Medicine Profile"
  ],
  "for_input_intro": "Any additional considerations for the team",
  "for_input": [
    "finalising Phase 2A plans",
    "preparation for next stage gate (Phase 2B combo)"
  ],
  "for_awareness_intro": "Team is sharing for awareness:",
  "for_awareness": [
    "Governance boards for this stage gate: ID Board, GSB and Access Review Board",
    "Early views on Development and Partnership Strategy"
  ]
}}

Now rewrite the following input in the similar style.

Return output in valid JSON with this exact structure:
{{

  "for_decision_intro": "...",
  "for_decision": ["...", "..."],
  "for_input_intro": "...",
  "for_input": ["...", "..."],
  "for_awareness_intro": "...",
  "for_awareness": ["...", "..."]
}}

Input data:
{input_data}
"""


def build_polish_prompt(payload: dict[str, Any]) -> str:
    """Build the notebook-style prompt with minimal modification."""
    return NOTEBOOK_PROMPT_TEMPLATE.format(
        input_data=json.dumps(payload, indent=2, ensure_ascii=True)
    )


SUMMARY_PROMPT_TEMPLATE = """You are a pharma governance communications specialist supporting governance review meetings.

Your task is to write a polished executive summary for the "Generated analysis" section of a governance slide.

Requirements:
- Use only the information provided in the input data
- Write in formal pharma governance language suitable for VIDRU Board, DRB, or PIB review
- Focus on the current timeline, key milestones or inflection points, and cumulative EPE/IPE context
- Mention the most relevant timing, phase progression, critical activities, dependencies, and financial takeaways if present
- Keep the output concise and presentation-ready
- Do not invent facts, dates, numbers, risks, or decisions
- Return plain text only
- Do not use headings, markdown, or JSON
- Return 3 to 5 short executive bullet points, one point per line
- Each point must be concise and slide-ready
- Do not return a paragraph

Input data:
{input_data}
"""


def build_summary_prompt(payload: dict[str, Any]) -> str:
    """Build the governance summary prompt."""
    return SUMMARY_PROMPT_TEMPLATE.format(
        input_data=json.dumps(payload, indent=2, ensure_ascii=True)
    )
