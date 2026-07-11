import base64
import os

favicon_path = r"d:\Ptojects\TeamBridge\mobile_app\dist\favicon.png"
with open(favicon_path, "rb") as f:
    encoded_string = base64.b64encode(f.read()).decode("utf-8")

img_tag = f'<img src="data:image/png;base64,{encoded_string}" style="width: 40px; height: 40px; border-radius: 10px; margin-right: 12px;" alt="CANDELS Logo" />'

target_div = '<div style="background: #F27A1A; color: #ffffff; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; margin-right: 12px;">C</div>'

for target_file in [
    r"d:\Ptojects\TeamBridge\mobile_app\backend\routes\Register.py",
    r"d:\Ptojects\TeamBridge\backend\routes\Register.py"
]:
    with open(target_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace(target_div, img_tag)
    
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(content)

print("Successfully injected logo into both Register.py files.")
