import os
import re
import json
import psycopg2
import openai
import pandas as pd
import openpyxl
from datetime import date
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://postgres:root@localhost:5432/empathai")

if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY is not set. Database load will fail during embedding sync.")

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

def normalize_text(text: str) -> str:
    """Normalize question text to match between CSV and Excel."""
    if not isinstance(text, str):
        return ""
    text = re.sub(r'^\d+[\s\.\)]+', '', text)
    text = text.lower()
    text = re.sub(r'[^a-z0-9]', '', text)
    return text.strip()

def parse_bullet_points_with_emojis(edited_text: str) -> str:
    """Reconstruct bullet points text formatted with ✅ and 🔹 from the raw psychologist text."""
    if not edited_text:
        return ""
        
    lines = edited_text.split('\n')
    bullets = []
    
    for line in lines:
        line_str = line.strip()
        if not line_str or line_str.lower().startswith("summary:"):
            continue
            
        clean = line_str.lstrip(" \t•-–—*")
        
        # Check if already has emojis
        if '✅' in clean or '🔹' in clean or '💡' in clean:
            bullets.append(clean)
        else:
            # Check context
            if "strength" in line_str.lower():
                bullets.append(f"✅ {clean}")
            elif "weakness" in line_str.lower():
                bullets.append(f"🔹 {clean}")
            else:
                # Add default bullets based on position or default to strengths/weaknesses
                bullets.append(f"🔹 {clean}")
                
    return "\n".join(bullets)

def load_data():
    csv_path = "c:/MyMercurie/EmpathAI/EmpathAI_Responses - Sheet1.csv"
    excel_path = "c:/MyMercurie/EmpathAI/Empath.AI pitched for Std 8th.xlsx"

    print("Reading responses CSV...")
    df_csv = pd.read_csv(csv_path)

    print("Reading interpretations Excel...")
    df_interp = pd.read_excel(excel_path, sheet_name="Student Interpretations")
    df_rules = pd.read_excel(excel_path, sheet_name="Interpretations")
    
    # Process rules
    df_rules = df_rules.iloc[:, :6]
    df_rules.columns = ["question", "domain", "answers", "range", "overall_meaning", "psychological_interpretation"]
    df_rules["question"] = df_rules["question"].ffill()
    
    rules_by_question = {}
    for q_text, group in df_rules.groupby("question", sort=False):
        norm_q = normalize_text(q_text)
        if norm_q:
            rules_by_question[norm_q] = group.reset_index(drop=True)

    conn = get_pool_connection()
    try:
        cur = conn.cursor()
        
        # Get active school_id
        cur.execute("SELECT id FROM schools LIMIT 1")
        school_row = cur.fetchone()
        school_id = school_row[0] if school_row else 1
        
        # We target group_id = 11, group_name = 'Class 10th Standard'
        group_id = 11
        group_name = 'Class 10th Standard'
        class_name = 'Class 10th Standard'
        
        for idx in range(1, 51):
            r_id = f"R{idx}"
            ri_id = f"RI" if idx == 1 else f"R{idx}"
            
            if ri_id not in df_interp.columns or r_id not in df_csv.columns:
                continue
                
            interp_text = str(df_interp.loc[0, ri_id] or "").strip()
            if not interp_text or interp_text == "nan":
                continue
                
            age = str(df_csv.iloc[0][r_id])
            gender = str(df_csv.iloc[1][r_id])
            
            student_num_id = 1000 + idx
            
            # Ensure dummy user exists in users table
            cur.execute("""
                INSERT INTO users (id, name, username, email, password, role, user_role, active, deleted, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, true, false, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username
            """, (
                student_num_id, f"Student R{idx}", f"student_r{idx}", 
                f"student_r{idx}@example.com", "$2a$10$8.4q6pE.K.doxXy1.LqruO3BwJ8a2x4BvFfMv.kH2rXjXf3fXhXqO",
                "STUDENT", "STUDENT"
            ))
            
            # Ensure dummy student exists in students table
            cur.execute("""
                INSERT INTO students (id, roll_no, class_name, gender, parent_name, school_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET roll_no = EXCLUDED.roll_no, class_name = EXCLUDED.class_name, gender = EXCLUDED.gender
            """, (
                student_num_id, idx, class_name, gender, "Parent", school_id
            ))
            
            # Reconstruct answers list
            answers_list = []
            for q_idx in range(2, 22):
                q_text = df_csv.iloc[q_idx]["Questions"]
                opt_letter = str(df_csv.iloc[q_idx][r_id]).strip()
                
                if not opt_letter or opt_letter == "nan":
                    continue
                    
                opt_idx = ord(opt_letter.upper()) - ord('A')
                selected_option_text = opt_letter
                interpretation_text = ""
                tag_text = ""
                
                norm_q = normalize_text(q_text)
                if norm_q in rules_by_question:
                    group = rules_by_question[norm_q]
                    if 0 <= opt_idx < len(group):
                        selected_option_text = str(group.loc[opt_idx, "answers"] or opt_letter)
                        interpretation_text = str(group.loc[opt_idx, "psychological_interpretation"] or "")
                        tag_text = str(group.loc[opt_idx, "overall_meaning"] or "")
                        
                answers_list.append({
                    "questionId": str(q_idx - 1),
                    "questionText": q_text,
                    "answer": selected_option_text,
                    "interpretation": interpretation_text,
                    "tag": tag_text
                })
                
            answers_json = json.dumps(answers_list)
            
            # Split psychologist text into Strengths and Weaknesses
            summary_text = ""
            strengths_list = []
            weaknesses_list = []
            
            # Simple splitter
            text_lower = interp_text.lower()
            s_idx = text_lower.find("strengths:")
            w_idx = text_lower.find("weaknesses:")
            
            if s_idx != -1 and w_idx != -1:
                if s_idx < w_idx:
                    strengths_part = interp_text[s_idx + 10 : w_idx].strip()
                    weaknesses_part = interp_text[w_idx + 11 :].strip()
                else:
                    weaknesses_part = interp_text[w_idx + 11 : s_idx].strip()
                    strengths_part = interp_text[s_idx + 10 :].strip()
                    
                strengths_list = [s.strip() for s in strengths_part.split('.') if s.strip()]
                weaknesses_list = [w.strip() for w in weaknesses_part.split('.') if w.strip()]
            else:
                # Default parse if markers not found
                strengths_list = [interp_text]
                
            # Build bullet points formatted text
            bullet_lines = []
            for s in strengths_list:
                bullet_lines.append(f"✅ {s}.")
            for w in weaknesses_list:
                bullet_lines.append(f"🔹 {w}.")
            bullet_points = "\n".join(bullet_lines)
            
            # Extract summary: use first 2 sentences of strengths
            summary_text = ". ".join(strengths_list[:2]) + "."
            
            # Check if this student already exists in reports
            cur.execute("""
                SELECT id FROM assessment_reports 
                WHERE student_id = %s AND group_id = %s AND session_date = %s
            """, (str(student_num_id), group_id, date.today()))
            
            row = cur.fetchone()
            if row:
                report_id = row[0]
                # Update existing
                cur.execute("""
                    UPDATE assessment_reports 
                    SET student_name = %s, answers_json = %s, summary_text = %s, 
                        bullet_points = %s, edited_summary_text = %s, edited_by = %s, confirmed = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    f"Student R{idx}", answers_json, summary_text,
                    bullet_points, interp_text, "Psychologist", True,
                    report_id
                ))
                print(f"Updated assessment report for student R{idx} in database.")
            else:
                # Insert new
                cur.execute("""
                    INSERT INTO assessment_reports 
                        (student_id, student_name, group_id, group_name, class_name, session_date, 
                         answers_json, summary_text, bullet_points, edited_summary_text, edited_by, confirmed, 
                         chroma_synced, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    RETURNING id
                """, (
                    str(student_num_id), f"Student R{idx}", group_id, group_name, class_name, date.today(),
                    answers_json, summary_text, bullet_points, interp_text, "Psychologist", True,
                    True
                ))
                report_id = cur.fetchone()[0]
                print(f"Inserted new assessment report for student R{idx} (ID: {report_id}) in database.")
            
            # Delete and Insert into student_responses table
            cur.execute("DELETE FROM student_responses WHERE student_id = %s AND group_id = %s", (student_num_id, group_id))
            for ans in answers_list:
                cur.execute("""
                    INSERT INTO student_responses 
                        (student_id, student_name, group_id, group_name, class_name, 
                         question_id, question_text, response_value, age, gender, school_name, submitted_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    student_num_id, f"Student R{idx}", group_id, group_name, class_name,
                    int(ans["questionId"]), ans["questionText"], ans["answer"][:255],
                    int(age) if age.isdigit() else 14, gender[:255], "Default School"
                ))
            print(f"Saved student responses for student R{idx} to student_responses table.")
            
            # Upsert into assessment_profile_docs in pgvector
            doc_id = f"report_{report_id}"
            answers_text = "\n".join([
                f"Question: {a['questionText']} | Student answered: {a['answer']}"
                for a in answers_list
            ])
            document_content = f"Student: Student R{idx} | Class: {class_name} | Date: {date.today()}\n\nStudent Answers:\n{answers_text}\n\nPsychologist Evaluation:\nSummary: {summary_text}\n{bullet_points}"
            
            embedding = _embed(document_content)
            embedding_str = f"[{','.join(map(str, embedding))}]"
            
            metadata = {
                "report_id": report_id,
                "student_id": str(student_num_id),
                "student_name": f"Student R{idx}",
                "class_name": class_name,
                "confirmed": True
            }
            
            cur.execute("""
                INSERT INTO assessment_profile_docs (doc_id, document, embedding, metadata)
                VALUES (%s, %s, %s::vector, %s)
                ON CONFLICT (doc_id) DO UPDATE
                SET document = EXCLUDED.document,
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata
            """, (doc_id, document_content, embedding_str, json.dumps(metadata)))
            
            # Update chroma_doc_id in assessment_reports
            cur.execute("""
                UPDATE assessment_reports 
                SET chroma_doc_id = %s, chroma_synced = true
                WHERE id = %s
            """, (doc_id, report_id))
            
            print(f"Synced student {r_id} profile document to pgvector (doc_id: {doc_id}).")

        conn.commit()
        print("Successfully loaded all 50 student cases into database and pgvector vector store!")
    finally:
        conn.close()

if __name__ == "__main__":
    load_data()
