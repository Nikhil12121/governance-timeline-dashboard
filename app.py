"""FastAPI application for governance consultation polishing and summary generation."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

try:
    from backend_llm.llm_service import LLMServiceError, polish_consultation
    from backend_llm.llm_summary import generate_governance_summary
except ModuleNotFoundError:
    from llm_service import LLMServiceError, polish_consultation
    from llm_summary import generate_governance_summary


class PolishConsultationRequest(BaseModel):
    """Notebook-aligned request payload for governance wording polish."""

    model_config = ConfigDict(extra="forbid")

    board_name: str = Field(default="", max_length=200)
    project_name: str = Field(default="", max_length=500)
    project_date: str = Field(default="", max_length=100)
    owner: str = Field(default="", max_length=200)
    for_decision: list[str] | str = Field(default_factory=list)
    for_input: list[str] | str = Field(default_factory=list)
    for_awareness: list[str] | str = Field(default_factory=list)


class PolishConsultationResponse(BaseModel):
    """Polished governance slide wording."""

    for_decision_intro: str
    for_decision: list[str]
    for_input_intro: str
    for_input: list[str]
    for_awareness_intro: str
    for_awareness: list[str]


class TimelineTaskInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=500)
    start: str = Field(default="", max_length=100)
    end: str = Field(default="", max_length=100)
    type: str = Field(default="", max_length=50)
    phase: str = Field(default="", max_length=200)
    manualContext: str = Field(default="", max_length=5000)
    isCritical: bool = False


class FinancialRowInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    label: str = Field(default="", max_length=200)
    values: list[str | int | float] = Field(default_factory=list)


class GenerateSummaryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_name: str = Field(default="", max_length=500)
    project_id: str = Field(default="", max_length=200)
    summary_type: str = Field(default="Executive", max_length=100)
    custom_instruction: str = Field(default="", max_length=4000)
    timeline_title: str = Field(default="", max_length=500)
    timeline_tasks: list[TimelineTaskInput] = Field(default_factory=list)
    financial_year_headers: list[str] = Field(default_factory=list)
    financial_rows: list[FinancialRowInput] = Field(default_factory=list)


class GenerateSummaryResponse(BaseModel):
    body: str


class HealthResponse(BaseModel):
    status: str


app = FastAPI(
    title="Governance Consultation Polisher API",
    version="1.0.0",
    description="Rewrites rough governance consultation notes into polished slide-ready wording.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/api/polish-consultation", response_model=PolishConsultationResponse)
def polish_consultation_endpoint(
    request: PolishConsultationRequest,
) -> PolishConsultationResponse:
    try:
        result = polish_consultation(request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unexpected server error while polishing consultation text.",
        ) from exc

    return PolishConsultationResponse(**result)


@app.post("/api/generate-summary", response_model=GenerateSummaryResponse)
def generate_summary_endpoint(
    request: GenerateSummaryRequest,
) -> GenerateSummaryResponse:
    try:
        body = generate_governance_summary(request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unexpected server error while generating governance summary.",
        ) from exc

    return GenerateSummaryResponse(body=body)
