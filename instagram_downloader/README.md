 Instagram Image Downloader

This script allows you to download images from Instagram posts and save them with a model_colorway naming format.

## Installation

1. Make sure you have Python 3.6 or higher installed
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Run the script:
   ```bash
   python instagram_downloader.py
   ```

2. When prompted:
   - Enter the Instagram post URL or shortcode
   - Enter the model name
   - Enter the colorway

3. The script will:
   - Create a `downloaded_images` directory if it doesn't exist
   - Download all images from the post
   - Save them with the format: `model_colorway_1.jpg`, `model_colorway_2.jpg`, etc.

## Notes

- The script will automatically clean the model and colorway names by replacing special characters with underscores
- Images are saved in the `downloaded_images` directory
- The script supports both full Instagram URLs and post shortcodes
- You can use this script for both single images and carousel posts 