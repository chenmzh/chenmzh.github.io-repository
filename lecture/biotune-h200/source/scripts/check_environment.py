"""Save the actual host's environment. Never infer VRAM from the product name."""
import importlib.metadata
import json
import platform
import subprocess
from pathlib import Path

def main():
    import torch
    data = {"python": platform.python_version(), "platform": platform.platform(),
        "torch": torch.__version__, "torch_cuda_build": torch.version.cuda,
        "cuda_available": torch.cuda.is_available(), "gpus": []}
    for i in range(torch.cuda.device_count()):
        prop = torch.cuda.get_device_properties(i)
        data['gpus'].append({"index": i, "name": prop.name, "total_memory_GiB": prop.total_memory/2**30,
            "compute_capability": [prop.major, prop.minor]})
    data['packages'] = {}
    for package in ['transformers', 'peft', 'accelerate', 'datasets', 'bitsandbytes']:
        try:
            data['packages'][package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            data['packages'][package] = None
    try:
        data['nvidia_smi'] = subprocess.run(['nvidia-smi'], capture_output=True, text=True, check=True).stdout
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        data['nvidia_smi_error'] = str(exc)
    Path('environment_report.json').write_text(json.dumps(data, indent=2))
    print(json.dumps(data, indent=2))
    if not torch.cuda.is_available():
        raise SystemExit('CUDA unavailable: resolve the driver/container/PyTorch build before training.')

if __name__ == '__main__':
    main()
