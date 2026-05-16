import os
import ctypes
import sys

torch_lib = r"C:\Python313\Lib\site-packages\torch\lib"
shm_dll = os.path.join(torch_lib, "shm.dll")

print(f"Checking {shm_dll}")
if not os.path.exists(shm_dll):
    print("File does not exist!")
    sys.exit(1)

# Add to DLL search path
if hasattr(os, "add_dll_directory"):
    os.add_dll_directory(torch_lib)

try:
    lib = ctypes.WinDLL(shm_dll)
    print("Successfully loaded shm.dll via ctypes")
except Exception as e:
    print(f"Failed to load shm.dll: {e}")

try:
    import torch
    print(f"Successfully imported torch: {torch.__version__}")
except Exception as e:
    print(f"Failed to import torch: {e}")
