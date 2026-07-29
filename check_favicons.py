from PIL import Image
import os

def check_and_enlarge(file_path, target_size=(512, 512)):
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist.")
        return
    
    try:
        with Image.open(file_path) as img:
            print(f"Checking {file_path}: {img.size} {img.format}")
            if img.size != target_size:
                print(f"Enlarging {file_path} to {target_size}...")
                resized_img = img.resize(target_size, Image.Resampling.LANCZOS)
                resized_img.save(file_path)
                print(f"Saved {file_path} with size {target_size}")
            else:
                print(f"{file_path} is already {target_size}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

public_dir = "/home/ubuntu/enosx/enosx-app/public"
check_and_enlarge(os.path.join(public_dir, "favicon.png"))
# ICO files are multi-resolution, resizing them with PIL might just save one layer
# but let's ensure the PNG is correct first.
