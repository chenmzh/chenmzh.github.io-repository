"""Choose the majority label on TRAIN, then score validation without fitting it."""
import argparse
from collections import Counter
from pathlib import Path
from common import read_jsonl, write_json, write_jsonl, LABELS

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--train', default='data/pubmedqa/train.jsonl')
    p.add_argument('--data', default='data/pubmedqa/validation.jsonl')
    p.add_argument('--out', default='runs/majority-validation')
    a = p.parse_args()
    train, rows = read_jsonl(a.train), read_jsonl(a.data)
    majority = Counter(r['gold'] for r in train).most_common(1)[0][0]
    pred = [{'id':r['id'], 'gold':r['gold'], 'prediction':majority} for r in rows]
    accuracy = sum(r['gold'] == majority for r in rows)/len(rows)
    f1 = []
    for label in LABELS:
        tp = sum(r['gold'] == label and majority == label for r in rows)
        fp = sum(r['gold'] != label and majority == label for r in rows)
        fn = sum(r['gold'] == label and majority != label for r in rows)
        f1.append(2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else 0.0)
    write_jsonl(Path(a.out)/'predictions.jsonl', pred)
    write_json(Path(a.out)/'metrics.json', {'majority_from_train':majority, 'accuracy':accuracy, 'macro_f1':sum(f1)/3, 'n':len(rows)})
    print({'majority_from_train':majority,'accuracy':accuracy,'macro_f1':sum(f1)/3})

if __name__ == '__main__': main()
