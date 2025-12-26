import requests

SERPER_API_KEY = "YOUR_SERPER_API_KEY"

def search_study_material(search_query: str):
    url = "https://google.serper.dev/search"
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "q": search_query,
        "num": 10
    }

    response = requests.post(url, headers=headers, json=payload)
    data = response.json()

    results = []
    for r in data.get("organic", []):
        results.append({
            "title": r.get("title"),
            "link": r.get("link")
        })

    return results
