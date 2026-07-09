import os
import re
import json
import psycopg2
import openai
import pandas as pd
import openpyxl
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://postgres:root@localhost:5432/empathai")

if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY is not set. Embedding & Fine-tuning will fail.")

def get_pool_connection():
    return psycopg2.connect(POSTGRES_URL)

def _embed(text: str) -> list[float]:
    """Embed text using OpenAI text-embedding-3-small."""
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding

def get_relevant_overviews(query_text: str, top_k: int = 5) -> list[str]:
    """Retrieve top_k psychologist overviews using cosine similarity search."""
    try:
        embedding = _embed(query_text)
        embedding_str = f"[{','.join(map(str, embedding))}]"
        
        conn = get_pool_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT document
                    FROM psychologist_overviews
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """, (embedding_str, top_k))
                rows = cur.fetchall()
                return [r[0] for r in rows]
        finally:
            conn.close()
    except Exception as e:
        print(f"Error searching overviews: {e}")
        return []

def parse_bullet_points_to_json(edited_text: str) -> dict:
    """Parse raw edited summary text bullet points into JSON format."""
    if not edited_text:
        return {"strengths": [], "Areas to Focus": []}
        
    lines = edited_text.split('\n')
    strengths = []
    areas_to_focus = []
    
    for line in lines:
        line_str = line.strip()
        if not line_str or line_str.lower().startswith("summary:"):
            continue
            
        # Strip leading bullet indicators
        clean = line_str.lstrip(" \t•-–—*")
        
        if '✅' in clean:
            strengths.append(clean.replace('✅', '').strip())
        elif '🔹' in clean:
            areas_to_focus.append(clean.replace('🔹', '').strip())
        elif '💡' in clean:
            areas_to_focus.append(clean.replace('💡', '').strip())
        elif len(clean) > 0:
            areas_to_focus.append(clean)
            
    return {
        "strengths": strengths[:3] if len(strengths) >= 3 else strengths,
        "Areas to Focus": areas_to_focus[:3] if len(areas_to_focus) >= 3 else areas_to_focus
    }

def normalize_text(text: str) -> str:
    """Normalize question text to match between CSV and Excel."""
    if not isinstance(text, str):
        return ""
    # Strip starting numbers like "1. ", "2) "
    text = re.sub(r'^\d+[\s\.\)]+', '', text)
    text = text.lower()
    text = re.sub(r'[^a-z0-9]', '', text)  # keep alphanumeric only
    return text.strip()

def prepare_dataset_from_files(csv_path: str, excel_path: str):
    """Compiles the fine-tuning dataset directly from CSV responses and psychologist interpretations Excel."""
    print(f"Loading responses CSV from: {csv_path}")
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return False
        
    if not os.path.exists(excel_path):
        print(f"Error: Excel file not found at {excel_path}")
        return False

    df_csv = pd.read_csv(csv_path)
    
    print(f"Loading interpretations Excel from: {excel_path}")
    wb = openpyxl.load_workbook(excel_path, read_only=True)
    if "Student Interpretations" not in wb.sheetnames:
        print("Error: 'Student Interpretations' sheet not found in Excel workbook.")
        return False
        
    # Read student interpretations sheet
    df_interp = pd.read_excel(excel_path, sheet_name="Student Interpretations")
    
    # Read interpretations rules sheet to map option letters to option texts
    df_rules = pd.read_excel(excel_path, sheet_name="Interpretations")
    df_rules = df_rules.iloc[:, :6]
    df_rules.columns = ["question", "domain", "answers", "range", "overall_meaning", "psychological_interpretation"]
    df_rules["question"] = df_rules["question"].ffill()
    
    # Group rules by normalized question text
    rules_by_question = {}
    for q_text, group in df_rules.groupby("question", sort=False):
        norm_q = normalize_text(q_text)
        if norm_q:
            rules_by_question[norm_q] = group.reset_index(drop=True)

    fine_tuning_records = []
    
    # Process students R1 to R50
    for idx in range(1, 51):
        r_id = f"R{idx}"
        ri_id = f"RI" if idx == 1 else f"R{idx}" # Col header for first student is RI
        
        # Check if we have interpretation text in Excel
        if ri_id not in df_interp.columns:
            print(f"Skipping student {r_id} (not found in Excel sheet columns).")
            continue
            
        interp_text = str(df_interp.loc[0, ri_id] or "").strip()
        if not interp_text or interp_text == "nan":
            print(f"Skipping student {r_id} (empty interpretation in Excel).")
            continue
            
        # Get matching student column in CSV
        if r_id not in df_csv.columns:
            print(f"Skipping student {r_id} (not found in CSV responses columns).")
            continue
            
        # Extract answers from CSV
        # Row 0: Age, Row 1: Gender, Rows 2-21: The 20 Questions
        age = df_csv.iloc[0][r_id]
        gender = df_csv.iloc[1][r_id]
        
        answers_parts = []
        for q_idx in range(2, 22):
            q_text = df_csv.iloc[q_idx]["Questions"]
            opt_letter = str(df_csv.iloc[q_idx][r_id]).strip()
            
            if not opt_letter or opt_letter == "nan":
                continue
                
            # Translate option letter (A, B, C, D) to option text
            opt_idx = ord(opt_letter.upper()) - ord('A')
            selected_option_text = opt_letter
            
            norm_q = normalize_text(q_text)
            if norm_q in rules_by_question:
                group = rules_by_question[norm_q]
                if 0 <= opt_idx < len(group):
                    selected_option_text = str(group.loc[opt_idx, "answers"] or opt_letter)
                    
            answers_parts.append(f"Question: {q_text} | Student answered: {selected_option_text}")
            
        answers_text = "\n".join(answers_parts)
        
        print(f"Embedding and matching overviews for student {r_id}...")
        overviews = get_relevant_overviews(answers_text, top_k=5)
        
        # Build prompt
        prompt_parts = ["PSYCHOLOGIST OVERVIEWS:"]
        for o_idx, o_doc in enumerate(overviews):
            prompt_parts.append(f"[{o_idx + 1}] {o_doc}")
            
        prompt_parts.append("\nSTUDENT ANSWERS:")
        prompt_parts.append(answers_text)
        prompt_parts.append("\nBased on the psychologist overviews and the student answers, write exactly 3 strength bullet points and 3 improvement bullet points. Be specific, encouraging, and actionable. Speak directly to the student using 'you'. Return ONLY valid JSON:")
        prompt_parts.append('{"strengths":["point1","point2","point3"],"Areas to Focus":["point1","point2","point3"]}')
        
        user_content = "\n".join(prompt_parts)
        
        # Build assistant response JSON
        target_json = parse_bullet_points_to_json(interp_text)
        assistant_content = json.dumps(target_json)
        
        record = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a student psychologist. Always respond with valid JSON only. No explanation, no preamble, no markdown."
                },
                {
                    "role": "user",
                    "content": user_content
                },
                {
                    "role": "assistant",
                    "content": assistant_content
                }
            ]
        }
        fine_tuning_records.append(record)

    output_file = "fine_tuning_dataset.jsonl"
    with open(output_file, "w", encoding="utf-8") as f:
        for r in fine_tuning_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            
    print(f"Successfully generated dataset with {len(fine_tuning_records)} records from files at: {output_file}")
    return True

def start_fine_tuning(file_path: str = "fine_tuning_dataset.jsonl", base_model: str = "gpt-4o-mini-2024-07-18"):
    """Uploads the dataset and starts a fine-tuning job in OpenAI."""
    if not os.path.exists(file_path):
        print(f"Error: {file_path} does not exist. Please compile dataset first.")
        return

    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    
    print(f"Uploading file '{file_path}' to OpenAI...")
    with open(file_path, "rb") as file_data:
        upload_response = client.files.create(
            file=file_data,
            purpose="fine-tune"
        )
    
    file_id = upload_response.id
    print(f"File uploaded successfully. File ID: {file_id}")
    
    print(f"Starting fine-tuning job targeting model '{base_model}'...")
    job = client.fine_tuning.jobs.create(
        training_file=file_id,
        model=base_model
    )
    
    print(f"Fine-tuning job created! Job ID: {job.id}")
    print(f"Status: {job.status}")
    print("You can track the job progress in your OpenAI Developer Dashboard under Fine-Tuning.")

if __name__ == "__main__":
    import sys
    
    csv_file = "c:/MyMercurie/EmpathAI/EmpathAI_Responses - Sheet1.csv"
    excel_file = "c:/MyMercurie/EmpathAI/Empath.AI pitched for Std 8th.xlsx"
    
    if len(sys.argv) > 1 and sys.argv[1] == "run":
        if prepare_dataset_from_files(csv_file, excel_file):
            start_fine_tuning()
    else:
        prepare_dataset_from_files(csv_file, excel_file)
