import chromadb
import pandas as pd
from chromadb.utils import embedding_functions

client = chromadb.PersistentClient(path="./chroma_store")
ef = embedding_functions.DefaultEmbeddingFunction()

collection = client.get_or_create_collection(
    name="psychologist_overviews",
    embedding_function=ef
)

df = pd.read_excel("Empath.AI pitched for Std 8th.xlsx", sheet_name="Interpretations")

# Only keep columns A to F
df = df.iloc[:, :6]
df.columns = ["question", "domain", "answers", "range", "overall_meaning", "psychological_interpretation"]

# Forward fill question and domain
df["question"] = df["question"].ffill()
df["domain"] = df["domain"].ffill()

# Drop rows where both psychological_interpretation and overall_meaning are empty
df = df[df["psychological_interpretation"].notna() | df["overall_meaning"].notna()]

# Drop rows where question is too short
df = df[df["question"].apply(lambda x: isinstance(x, str) and len(x.strip()) > 5)]

grouped = df.groupby("question", sort=False)

for i, (question_text, group) in enumerate(grouped):

    overview_parts = []
    overview_parts.append(f"Question: {question_text}")
    overview_parts.append(f"Domain: {group['domain'].dropna().iloc[0] if not group['domain'].dropna().empty else ''}")
    overview_parts.append("")

    for _, row in group.iterrows():
        parts = []
        if pd.notna(row.get("answers")) and str(row["answers"]).strip():
            parts.append(f"Answer Option: {row['answers']}")
        if pd.notna(row.get("range")) and str(row["range"]).strip():
            parts.append(f"Range: {row['range']}")
        if pd.notna(row.get("overall_meaning")) and str(row["overall_meaning"]).strip():
            parts.append(f"Overall Meaning: {row['overall_meaning']}")
        if pd.notna(row.get("psychological_interpretation")) and str(row["psychological_interpretation"]).strip():
            parts.append(f"Psychological Interpretation: {row['psychological_interpretation']}")
        if parts:
            overview_parts.append(" | ".join(parts))

    overview_text = "\n".join(overview_parts)

    collection.add(
        ids=[f"question_{i+1}"],
        documents=[overview_text],
        metadatas=[{
            "question_id": i + 1,
            "question_text": question_text[:200],
            "domain": str(group["domain"].dropna().iloc[0]) if not group["domain"].dropna().empty else ""
        }]
    )

    print(f"Loaded Q{i+1}: {question_text[:70]}...")

print(f"\nTotal loaded: {collection.count()} overviews into ChromaDB successfully.")