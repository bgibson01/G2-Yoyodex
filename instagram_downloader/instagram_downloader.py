import instaloader
import os
import re
import json
from urllib.parse import urlparse
from datetime import datetime
from known_models import KNOWN_MODELS, KNOWN_COLORWAYS, QUANTITY_PATTERNS

# File to store successful manual entries
MANUAL_ENTRIES_FILE = 'manual_entries.json'

def load_manual_entries():
    """Load previously successful manual entries."""
    if os.path.exists(MANUAL_ENTRIES_FILE):
        with open(MANUAL_ENTRIES_FILE, 'r') as f:
            return json.load(f)
    return {'models': [], 'colorways': [], 'quantities': [], 'dates': []}

def save_manual_entries(entries):
    """Save successful manual entries."""
    with open(MANUAL_ENTRIES_FILE, 'w') as f:
        json.dump(entries, f, indent=2)

def update_known_lists(entries):
    """Update the known lists with successful manual entries."""
    global KNOWN_MODELS, KNOWN_COLORWAYS, QUANTITY_PATTERNS
    
    # Add new models and colorways if they don't exist
    for model in entries['models']:
        if model.lower() not in [m.lower() for m in KNOWN_MODELS]:
            KNOWN_MODELS.append(model)
    
    for colorway in entries['colorways']:
        if colorway.lower() not in [c.lower() for c in KNOWN_COLORWAYS]:
            KNOWN_COLORWAYS.append(colorway)
    
    # Add new quantity patterns
    for quantity in entries['quantities']:
        pattern = rf"(\d+)\s*{re.escape(quantity)}"
        if pattern not in QUANTITY_PATTERNS:
            QUANTITY_PATTERNS.append(pattern)

def clean_filename(text):
    """Clean text to be used in filenames."""
    if not text:
        return ""
    # Replace spaces with hyphens
    cleaned = text.lower().replace(' ', '-')
    # Replace any remaining special characters with hyphens
    cleaned = re.sub(r'[^\w\-]', '-', cleaned)
    # Remove multiple consecutive hyphens
    cleaned = re.sub(r'-+', '-', cleaned)
    # Remove leading/trailing hyphens
    return cleaned.strip('-')

def format_for_sheet(text):
    """Format text for Google Sheet output (capitalize first letter of each word)."""
    if not text:
        return ""
    return ' '.join(word.capitalize() for word in text.split())

def extract_shortcode_from_url(url):
    """Extract the shortcode from an Instagram post URL."""
    if 'instagram.com' in url:
        path = urlparse(url).path
        shortcode = path.strip('/').split('/')[-1]
    else:
        shortcode = url
    return shortcode

def detect_model_from_caption(caption):
    """Detect model name from caption using known models list."""
    if not caption:
        return None
        
    caption_lower = caption.lower()
    
    # First try to find model in the first part of the caption (before any date/time)
    first_part = caption_lower.split('-')[0].strip()
    
    # Check for model names in the first part
    for model in KNOWN_MODELS:
        # Check for exact model name
        if f" {model} " in f" {first_part} ":
            return model
        # Check for model name with spaces
        model_with_spaces = model.replace('-', ' ')
        if f" {model_with_spaces} " in f" {first_part} ":
            return model
        # Check for model name at start of caption
        if first_part.startswith(model + " ") or first_part.startswith(model_with_spaces + " "):
            return model
            
    # If not found in first part, check the entire caption
    for model in KNOWN_MODELS:
        # Check for exact model name
        if f" {model} " in f" {caption_lower} ":
            return model
        # Check for model name with spaces
        model_with_spaces = model.replace('-', ' ')
        if f" {model_with_spaces} " in f" {caption_lower} ":
            return model
            
    # If still not found, check hashtags
    hashtags = [tag.lower() for tag in caption_lower.split() if tag.startswith('#')]
    for tag in hashtags:
        if 'g2' in tag:
            potential_model = tag.replace('#g2', '').strip()
            if potential_model in KNOWN_MODELS:
                return potential_model
                
    return None

def detect_colorway_from_caption(caption, model):
    """Detect colorway from caption using known colorways list."""
    if not caption or not model:
        return None
        
    caption_lower = caption.lower()
    
    # First try to find colorway in the second part of the caption (after model)
    parts = caption_lower.split('-')
    if len(parts) > 1:
        second_part = parts[1].strip()
        
        # Check for colorways in the second part
        for colorway in KNOWN_COLORWAYS:
            # Check for exact colorway name
            if f" {colorway} " in f" {second_part} ":
                return colorway
            # Check for colorway name with spaces
            colorway_with_spaces = colorway.replace('-', ' ')
            if f" {colorway_with_spaces} " in f" {second_part} ":
                return colorway
            # Check for colorway name at start of second part
            if second_part.startswith(colorway + " ") or second_part.startswith(colorway_with_spaces + " "):
                return colorway
    
    # If not found in second part, check the entire caption
    for colorway in KNOWN_COLORWAYS:
        # Check for exact colorway name
        if f" {colorway} " in f" {caption_lower} ":
            return colorway
        # Check for colorway name with spaces
        colorway_with_spaces = colorway.replace('-', ' ')
        if f" {colorway_with_spaces} " in f" {caption_lower} ":
            return colorway
            
    return None

def extract_release_date(caption):
    """Extract release date from caption."""
    # Common date patterns in captions
    date_patterns = [
        r'(\d{1,2}\.\d{1,2}\.\d{2,4})',  # MM.DD.YY or MM.DD.YYYY
        r'(\d{1,2}/\d{1,2}/\d{2,4})',    # MM/DD/YY or MM/DD/YYYY
        r'(\w+ \d{1,2},? \d{4})',        # Month DD, YYYY or Month DD YYYY
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, caption)
        if match:
            date_str = match.group(1)
            try:
                # Try different date formats
                for fmt in ['%m.%d.%Y', '%m/%d/%Y', '%B %d %Y', '%B %d, %Y']:
                    try:
                        date = datetime.strptime(date_str, fmt)
                        return date.strftime('%B %d %Y')
                    except ValueError:
                        continue
            except:
                continue
    return ""

def extract_quantity(caption):
    """Extract quantity from caption using predefined patterns."""
    for pattern in QUANTITY_PATTERNS:
        match = re.search(pattern, caption, re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                continue
    return None

def is_glitch(caption):
    """Check if the post indicates a glitch."""
    glitch_indicators = ['glitch', 'failed QC', 'failed to pass QC']
    return any(indicator.lower() in caption.lower() for indicator in glitch_indicators)

def format_date(date):
    """Format date as Month D, YYYY (e.g., August 3, 2020)."""
    # Get the month name
    month = date.strftime('%B')
    # Get the day without leading zero
    day = str(int(date.strftime('%d')))
    # Get the year
    year = date.strftime('%Y')
    return f"{month} {day}, {year}"

def parse_date(date_str):
    """Parse various date formats and return in Month D, YYYY format."""
    if not date_str:
        return None
        
    # Try different date formats
    date_formats = [
        '%m/%d/%y',    # 4/1/25
        '%m/%d/%Y',    # 4/1/2025
        '%m.%d.%y',    # 4.1.25
        '%m.%d.%Y',    # 4.1.2025
        '%Y-%m-%d',    # 2025-04-01
        '%B %d %Y',    # April 1 2025
        '%B %d, %Y',   # April 1, 2025
    ]
    
    for fmt in date_formats:
        try:
            date = datetime.strptime(date_str, fmt)
            return format_date(date)
        except ValueError:
            continue
    
    return None

def download_instagram_post(url, model=None, colorway=None):
    """Download all images from an Instagram post and save with model_colorway format."""
    # Initialize instaloader
    L = instaloader.Instaloader()
    
    try:
        # Extract shortcode from URL
        shortcode = extract_shortcode_from_url(url)
        
        # Get the post
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        
        # Get caption
        caption = post.caption if post.caption else ""
        
        # Get post date
        post_date = format_date(post.date)
        
        print("\nPost Information:")
        print("=" * 50)
        print(f"Caption: {caption}")
        print(f"Post Date: {post_date}")
        print("=" * 50)
        
        # Get model and colorway from user
        model = input("\nEnter model name: ").strip()
        colorway = input("Enter colorway: ").strip()
        
        # Clean model and colorway names for filenames
        model_clean = clean_filename(model)
        colorway_clean = clean_filename(colorway)
        
        # Format model and colorway for Google Sheet
        model_sheet = format_for_sheet(model)
        colorway_sheet = format_for_sheet(colorway)
        
        print(f"\nModel: {model_sheet} (filename: {model_clean})")
        print(f"Colorway: {colorway_sheet} (filename: {colorway_clean})")
        
        # Confirm before proceeding
        confirm = input("\nIs this information correct? (y/n): ").lower()
        if confirm != 'y':
            print("Operation cancelled.")
            return
        
        # Create model directory if it doesn't exist
        model_dir = os.path.join('assets', model_clean)
        os.makedirs(model_dir, exist_ok=True)
        
        # Get release date
        while True:
            release_date_input = input(f"\nEnter release date (MM/DD/YYYY) [Press Enter to use post date {post_date}]: ").strip()
            if not release_date_input:
                release_date = post_date
                break
            release_date = parse_date(release_date_input)
            if release_date:
                break
            print("Invalid date format. Please try again or press Enter to use post date.")
        
        # Get quantity
        while True:
            quantity_input = input("Enter quantity (number only, or press Enter for null): ").strip()
            if not quantity_input:
                quantity = None
                break
            try:
                quantity = int(quantity_input)
                break
            except ValueError:
                print("Please enter a valid number or press Enter for null")
        
        # Download each image
        image_urls = []
        additional_images = []
        
        try:
            print("\nDownloading images:")
            print("=" * 50)
            
            # Get all images from the post
            for i, node in enumerate(post.get_sidecar_nodes()):
                # Get the image URL
                image_url = node.display_url
                
                # Generate filenames
                if i == 0:
                    # For saving the file
                    save_filename = f"{model_clean}_{colorway_clean}"
                    image_path = os.path.join(model_dir, save_filename)
                    # For Google Sheet URL
                    full_url = f"assets/{model_clean}/{save_filename}.jpg"
                    image_urls.append(full_url)
                    print(f"Main image: {full_url}")
                else:
                    # For saving the file
                    save_filename = f"{model_clean}_{colorway_clean}_{i+1}"
                    image_path = os.path.join(model_dir, save_filename)
                    # For Google Sheet URL
                    full_url = f"assets/{model_clean}/{save_filename}.jpg"
                    additional_images.append(full_url)
                    print(f"Additional image {i+1}: {full_url}")
                
                # Download the image
                L.download_pic(filename=image_path, url=image_url, mtime=post.date)
                print(f"✓ Saved: {image_path}")
            
            # If no sidecar nodes, try to get the main image
            if not image_urls:
                image_url = post.url
                # For saving the file
                save_filename = f"{model_clean}_{colorway_clean}"
                image_path = os.path.join(model_dir, save_filename)
                # For Google Sheet URL
                full_url = f"assets/{model_clean}/{save_filename}.jpg"
                image_urls.append(full_url)
                print(f"Main image: {full_url}")
                L.download_pic(filename=image_path, url=image_url, mtime=post.date)
                print(f"✓ Saved: {image_path}")
                
            print("=" * 50)
        except Exception as e:
            print(f"Warning: Could not download images: {str(e)}")
        
        # Prepare Google Sheet data
        main_image = image_urls[0] if image_urls else ""
        additional_images_str = ", ".join(additional_images) if additional_images else ""
        
        # Print Google Sheet data
        print("\nGoogle Sheet Data:")
        print("=" * 50)
        print(f"Model: {model_sheet}")
        print(f"Colorway: {colorway_sheet}")
        print(f"Release Date: {release_date}")
        print(f"Type: Production")
        print(f"Quantity: {quantity if quantity is not None else 'null'}")
        print(f"Image URL: {main_image}")
        print(f"Additional Images: {additional_images_str}")
        print(f"Description: {caption}")
        print(f"OG Caption: {caption}")
        print("=" * 50)
        
        print("\nAll images downloaded successfully!")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        if 'caption' in locals():
            print("\nCaption for reference:")
            print("=" * 50)
            print(caption)
            print("=" * 50)

def process_captions(captions):
    """Process multiple captions and extract model and colorway information."""
    results = []
    
    for caption in captions:
        # Clean up the caption
        caption = caption.strip()
        if not caption:
            continue
            
        # Try to detect model and colorway
        model = detect_model_from_caption(caption)
        colorway = detect_colorway_from_caption(caption, model) if model else None
        
        # If model detection failed, try to find it in the first part of the caption
        if not model:
            # Look for model names in the first part of the caption (before any date/time)
            first_part = caption.split('-')[0].strip()
            model = detect_model_from_caption(first_part)
            if model:
                colorway = detect_colorway_from_caption(caption, model)
        
        # If still no model, try to find it in the hashtags
        if not model:
            hashtags = [tag.lower() for tag in caption.split() if tag.startswith('#')]
            for tag in hashtags:
                if 'g2' in tag:
                    potential_model = tag.replace('#g2', '').strip()
                    if potential_model in KNOWN_MODELS:
                        model = potential_model
                        colorway = detect_colorway_from_caption(caption, model)
                        break
        
        # Extract quantity if present
        quantity = extract_quantity(caption)
        
        # Extract release date if present
        release_date = extract_release_date(caption)
        
        # Check if it's a glitch
        is_glitch = is_glitch(caption)
        
        # Check if it's a prototype
        is_prototype = 'proto' in caption.lower()
        
        results.append({
            'caption': caption,
            'model': model,
            'colorway': colorway,
            'quantity': quantity,
            'release_date': release_date,
            'is_glitch': is_glitch,
            'is_prototype': is_prototype
        })
    
    return results

def main():
    print("Instagram Post Image Downloader")
    print("==============================")
    
    while True:
        url = input("\nEnter Instagram post URL (or 'quit' to exit): ")
        
        if url.lower() == 'quit':
            break
            
        try:
            download_instagram_post(url)
        except Exception as e:
            print(f"Error: {str(e)}")
            if 'caption' in locals():
                print("\nCaption for reference:")
                print("=" * 50)
                print(caption)
                print("=" * 50)

if __name__ == "__main__":
    main() 