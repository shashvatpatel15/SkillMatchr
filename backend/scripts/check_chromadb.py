import sys
import os

# Ensure backend modules can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.core.chromadb_client import get_candidates_collection, get_jobs_collection

def check_chromadb():
    print("=== ChromaDB Status ===")
    
    # Check Candidates Collection
    try:
        candidates_col = get_candidates_collection()
        candidate_count = candidates_col.count()
        print(f"[OK] 'candidates' collection found.")
        print(f"     Total candidates indexed: {candidate_count}")
        
        if candidate_count > 0:
            sample = candidates_col.peek(1)
            print("\n     Sample Candidate Item:")
            print(f"       - Vector ID: {sample['ids'][0]}")
            if sample.get('metadatas') and len(sample['metadatas']) > 0:
                print(f"       - Metadata: {sample['metadatas'][0]}")
    except Exception as e:
        print(f"[ERROR] Error checking 'candidates' collection: {e}")

    print("\n-----------------------\n")
    
    # Check Jobs Collection
    try:
        jobs_col = get_jobs_collection()
        job_count = jobs_col.count()
        print(f"[OK] 'jobs' collection found.")
        print(f"     Total jobs indexed: {job_count}")
        
        if job_count > 0:
            sample = jobs_col.peek(1)
            print("\n     Sample Job Item:")
            print(f"       - Vector ID: {sample['ids'][0]}")
            if sample.get('metadatas') and len(sample['metadatas']) > 0:
                print(f"       - Metadata: {sample['metadatas'][0]}")
    except Exception as e:
        print(f"[ERROR] Error checking 'jobs' collection: {e}")

if __name__ == "__main__":
    check_chromadb()
