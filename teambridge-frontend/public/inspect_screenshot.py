import cv2
import numpy as np

def inspect_screenshot():
    path = r"C:\Users\ADMIN\.gemini\antigravity-ide\brain\1170ab6e-6d98-4edd-9684-e013964fe376\dashboard_logo_verification_1781957580095.png"
    img = cv2.imread(path)
    if img is None:
        print("Screenshot not found")
        return
        
    # Crop to top-left area of the sidebar (sidebar width is about 280px, height of brand is about 80px)
    # Let's crop x: 0 to 300, y: 0 to 120
    crop = img[0:120, 0:300]
    
    # Save cropped portion for reference
    cv2.imwrite(r"C:\Users\ADMIN\.gemini\antigravity-ide\brain\1170ab6e-6d98-4edd-9684-e013964fe376\logo_crop_debug.png", crop)
    print("Saved cropped debug logo area to logo_crop_debug.png")
    
    # Count pixels by color in the crop area
    # Convert to grayscale
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    
    # Print average pixel intensity in blocks
    # Sidebar background is light grey/white, so background values are high (around 240-255).
    # Non-background pixels (flame orange or dark text) will be lower.
    # Let's print a 10x10 grid of the average intensities to see where shapes are.
    h, w = gray.shape
    grid_h, grid_w = 10, 15
    block_h, block_w = h // grid_h, w // grid_w
    
    print("\nVisual representation of logo region intensity (lower is darker):")
    for r in range(grid_h):
        row_str = []
        for c in range(grid_w):
            block = gray[r*block_h:(r+1)*block_h, c*block_w:(c+1)*block_w]
            avg = np.mean(block)
            if avg < 150:
                row_str.append("#")  # Dark (flame or dark text)
            elif avg < 245:
                row_str.append(".")  # Medium
            else:
                row_str.append(" ")  # Light (background)
        print("".join(row_str))

if __name__ == "__main__":
    inspect_screenshot()
