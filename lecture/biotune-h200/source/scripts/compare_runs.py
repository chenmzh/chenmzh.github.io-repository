"""Paired bootstrap of accuracy difference on identical held-out examples."""
import argparse
import numpy as np
from common import read_jsonl, write_json

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline', required=True)
    p.add_argument('--candidate', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--resamples', type=int, default=10000)
    a = p.parse_args()
    if a.resamples < 100:
        p.error('Use at least 100 bootstrap draws')
    def keyed(path):
        rows = read_jsonl(path)
        out = {r['id']:r for r in rows}
        if len(rows) != len(out): raise ValueError('Duplicate IDs')
        return out
    b, c = keyed(a.baseline), keyed(a.candidate)
    if set(b) != set(c): raise ValueError('Runs must evaluate exactly the same IDs')
    ids = sorted(b)
    if any(b[i]['gold'] != c[i]['gold'] for i in ids): raise ValueError('Conflicting gold labels')
    diff = np.array([int(c[i]['prediction'] == c[i]['gold']) - int(b[i]['prediction'] == b[i]['gold']) for i in ids], dtype=float)
    rng = np.random.default_rng(42)
    samples = np.array([rng.choice(diff, len(diff), replace=True).mean() for _ in range(a.resamples)])
    result = {'n':len(ids),'accuracy_difference_candidate_minus_baseline':float(diff.mean()),
        'paired_bootstrap_percentile_95_ci':np.quantile(samples,[0.025,0.975]).tolist(),
        'resamples':a.resamples,'seed':42,
        'note':'A descriptive paired interval, not a correction for hyperparameter search or a proof of clinical/general biological validity.'}
    write_json(a.out,result)
    print(result)

if __name__ == '__main__': main()
