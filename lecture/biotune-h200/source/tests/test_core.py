import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]/'scripts'))
from common import make_record, stratified_dev_ids, audit_splits, parse_decision, encode_completion, text_hash

def item(label='yes', question='Toy Q', evidence='Toy evidence'):
    return {'QUESTION': question, 'CONTEXTS': [evidence], 'final_decision': label,
            'LONG_ANSWER': 'SECRET GOLD CONCLUSION', 'reasoning_free_pred': 'SECRET PREDICTION'}

def test_no_answer_leak():
    row = make_record('a', item())
    assert 'SECRET' not in str(row['prompt'])
    assert parse_decision(row['completion'][0]['content']) == 'yes'

def test_stratified_split():
    rows = [make_record(str(i), item(['yes','no','maybe'][i%3], f'q{i}', f'e{i}')) for i in range(500)]
    ids = stratified_dev_ids(rows, 50, 42)
    assert len(ids) == 50
    assert ids == stratified_dev_ids(rows, 50, 42)
    assert ids != stratified_dev_ids(rows, 50, 123)
    split = {'train': [r for r in rows if r['id'] not in ids], 'validation': [r for r in rows if r['id'] in ids]}
    assert not audit_splits(split)['cross_split_collisions']

def test_duplicate_detection():
    a = make_record('a', item())
    b = make_record('b', item())
    report = audit_splits({'train':[a], 'test':[b]})
    assert len(report['cross_split_collisions']) == 2

def test_invalid_not_maybe():
    for text in ['maybe', '<think>x</think>{"decision":"yes"}', '{"decision":"maybe","extra":1}', '{"decision":"unknown"}', '[]']:
        assert parse_decision(text) == 'INVALID'
    assert parse_decision('{"decision":"maybe"}') == 'maybe'

def test_eos_is_supervised():
    class Tokenizer:
        eos_token_id = 99
        def apply_chat_template(self, *args, **kwargs):
            assert kwargs['enable_thinking'] is False
            return [1,2,3]
        def encode(self, *args, **kwargs):
            return [10,11]
    result = encode_completion(Tokenizer(), make_record('a', item()), 10)
    assert result['labels'] == [-100,-100,-100,10,11,99]
    assert result['input_ids'] == [1,2,3,10,11,99]

def test_no_silent_truncation():
    import pytest
    class Tokenizer:
        eos_token_id = 99
        def apply_chat_template(self, *args, **kwargs): return [1,2,3]
        def encode(self, *args, **kwargs): return [4,5]
    with pytest.raises(ValueError, match='no silent truncation'):
        encode_completion(Tokenizer(), make_record('a', item()), 5)

def test_hash_normalization():
    assert text_hash(' Gene\n  A ') == text_hash('gene a')

def test_invalid_label():
    import pytest
    with pytest.raises(ValueError):
        make_record('a', item('unknown'))
