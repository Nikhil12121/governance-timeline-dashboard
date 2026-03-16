import requests

payload = {
    "board_name": "DRB",
    "project_name": "HBV ASO Next Generation",
    "project_date": "02 September 2025",
    "owner": "David Kim",
    "for_decision": [
        "following the recent FDA interaction there are additional non clinical safety studies that they want us to complete before we move forward so we need approval to conduct those studies and adjust the Phase 1 plan accordingly",
        "because these studies will push the timeline slightly we also need confirmation that the board supports continuing with the current program rather than pausing development"
    ],
    "for_input": [
        "it would be useful to get the boards perspective on how aggressively we should continue investing in this program given the evolving regulatory expectations",
        "we are also considering whether to explore partnership options with external biotech companies and would welcome thoughts from the board"
    ],
    "for_awareness": [
        "recent internal portfolio review suggested the program still fits well with the company strategy but risk level has increased",
        "team has started some exploratory work on alternative delivery approaches although this is still early stage"
    ]
}

response = requests.post(
    "http://127.0.0.1:8000/api/polish-consultation",
    json=payload,
    timeout=120,
)

print(response.status_code)
print(response.json())
