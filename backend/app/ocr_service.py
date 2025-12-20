"""
OCR Service using Groq API for text extraction from images and videos
"""
import logging
import base64
import os
import tempfile
import subprocess
from typing import Optional, List
from groq import Groq
from app.config import settings
import cv2
import numpy as np
from PIL import Image
import io

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "meta-llama/llama-4-scout-17b-16e-instruct"  # Using Llama Vision for OCR
    
    def _encode_image_to_base64(self, image_path: str) -> str:
        """Convert image to base64 string"""
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Error encoding image to base64: {e}")
            raise
    
    def _preprocess_image_for_ocr(self, image_path: str) -> str:
        """Preprocess image to improve OCR accuracy"""
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Could not read image file")
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply denoising
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # Apply adaptive thresholding to improve text contrast
            thresh = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Save preprocessed image to temporary file
            temp_path = image_path.replace('.', '_processed.')
            cv2.imwrite(temp_path, thresh)
            
            return temp_path
        except Exception as e:
            logger.warning(f"Image preprocessing failed, using original: {e}")
            return image_path
    
    async def extract_text_from_image(self, image_path: str) -> str:
        """Extract text from image using Groq Vision API"""
        try:
            # Preprocess image for better OCR
            processed_image_path = self._preprocess_image_for_ocr(image_path)
            
            # Encode image to base64
            base64_image = self._encode_image_to_base64(processed_image_path)
            
            # Create the prompt for OCR
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Please extract all text content from this image. 
                            Focus on:
                            1. All readable text, including handwritten text if present
                            2. Maintain the structure and formatting as much as possible
                            3. Include any numbers, formulas, or equations
                            4. If there are tables, preserve the table structure
                            5. If no text is found, respond with 'No readable text found in image'
                            
                            Please provide only the extracted text without any additional commentary."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]
            
            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=2000,
                temperature=0.1
            )
            
            extracted_text = response.choices[0].message.content.strip()
            
            # Clean up preprocessed image if it was created
            if processed_image_path != image_path and os.path.exists(processed_image_path):
                os.remove(processed_image_path)
            
            logger.info(f"Successfully extracted text from image: {len(extracted_text)} characters")
            return extracted_text
            
        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            return f"OCR extraction failed: {str(e)}"
    
    def _extract_frames_from_video(self, video_path: str, max_frames: int = 10) -> List[str]:
        """Extract frames from video for OCR processing"""
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file")
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = total_frames / fps if fps > 0 else 0
            
            # Extract frames at regular intervals
            frame_interval = max(1, total_frames // max_frames)
            frame_paths = []
            
            frame_count = 0
            extracted_count = 0
            
            while cap.isOpened() and extracted_count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_count % frame_interval == 0:
                    # Save frame as temporary image
                    temp_dir = tempfile.gettempdir()
                    frame_path = os.path.join(temp_dir, f"video_frame_{extracted_count}.jpg")
                    cv2.imwrite(frame_path, frame)
                    frame_paths.append(frame_path)
                    extracted_count += 1
                
                frame_count += 1
            
            cap.release()
            logger.info(f"Extracted {len(frame_paths)} frames from video")
            return frame_paths
            
        except Exception as e:
            logger.error(f"Error extracting frames from video: {e}")
            return []
    
    async def extract_text_from_video(self, video_path: str) -> str:
        """Extract text from video by analyzing key frames"""
        try:
            # Extract frames from video
            frame_paths = self._extract_frames_from_video(video_path)
            
            if not frame_paths:
                return "No frames could be extracted from video"
            
            all_text = []
            unique_texts = set()
            
            # Process each frame
            for i, frame_path in enumerate(frame_paths):
                try:
                    frame_text = await self.extract_text_from_image(frame_path)
                    
                    # Only add if text is meaningful and not duplicate
                    if (frame_text and 
                        len(frame_text.strip()) > 10 and 
                        "No readable text found" not in frame_text and
                        "OCR extraction failed" not in frame_text):
                        
                        # Simple deduplication
                        text_hash = hash(frame_text.strip().lower())
                        if text_hash not in unique_texts:
                            unique_texts.add(text_hash)
                            all_text.append(f"--- Frame {i+1} ---\n{frame_text}\n")
                    
                    # Clean up frame file
                    if os.path.exists(frame_path):
                        os.remove(frame_path)
                        
                except Exception as e:
                    logger.warning(f"Error processing frame {i+1}: {e}")
                    continue
            
            if all_text:
                combined_text = "\n".join(all_text)
                logger.info(f"Successfully extracted text from video: {len(combined_text)} characters")
                return combined_text
            else:
                return "No readable text found in video frames"
                
        except Exception as e:
            logger.error(f"Error extracting text from video: {e}")
            return f"Video OCR extraction failed: {str(e)}"
    
    async def extract_text_from_presentation(self, file_path: str) -> str:
        """Extract text from PowerPoint presentations"""
        try:
            from pptx import Presentation
            
            prs = Presentation(file_path)
            all_text = []
            
            for slide_num, slide in enumerate(prs.slides, 1):
                slide_text = []
                slide_text.append(f"--- Slide {slide_num} ---")
                
                # Extract text from shapes
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_text.append(shape.text.strip())
                
                # Extract text from tables
                if hasattr(slide, 'shapes'):
                    for shape in slide.shapes:
                        if shape.has_table:
                            table = shape.table
                            for row in table.rows:
                                row_text = []
                                for cell in row.cells:
                                    if cell.text.strip():
                                        row_text.append(cell.text.strip())
                                if row_text:
                                    slide_text.append(" | ".join(row_text))
                
                if len(slide_text) > 1:  # More than just the slide header
                    all_text.append("\n".join(slide_text))
            
            combined_text = "\n\n".join(all_text)
            logger.info(f"Successfully extracted text from presentation: {len(combined_text)} characters")
            return combined_text
            
        except Exception as e:
            logger.error(f"Error extracting text from presentation: {e}")
            return f"Presentation text extraction failed: {str(e)}"
    
    def is_image_file(self, filename: str) -> bool:
        """Check if file is an image"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.gif'}
        return os.path.splitext(filename.lower())[1] in image_extensions
    
    def is_video_file(self, filename: str) -> bool:
        """Check if file is a video"""
        video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v'}
        return os.path.splitext(filename.lower())[1] in video_extensions
    
    def is_presentation_file(self, filename: str) -> bool:
        """Check if file is a presentation"""
        presentation_extensions = {'.ppt', '.pptx'}
        return os.path.splitext(filename.lower())[1] in presentation_extensions

# Create global instance
ocr_service = OCRService()