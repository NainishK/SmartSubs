from ai_client import _enrich_item
import json

def test_enrichment():
    # Mock item returned by Gemini (Title only, no details)
    item = {
        "title": "Mindhunter",
        "service": "Netflix",
        "reason": "AI Recommendation"
    }

    print("Before Enrichment:")
    print(json.dumps(item, indent=2))

    # Apply Enrichment (uses tmdb_client internally)
    _enrich_item(item)

    print("\nAfter Enrichment:")
    print(json.dumps(item, indent=2))

    if item.get("poster_path"):
        print("\nSUCCESS: Poster path found!")
    else:
        print("\nFAILURE: No poster path found.")

if __name__ == "__main__":
    test_enrichment()
