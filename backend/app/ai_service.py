from groq import Groq
from app.config import settings
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as google_generativeai_old
from google import genai
import io
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Image as ReportLabImage, PageBreak, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        if settings.GEMINI_API_KEY:
            google_generativeai_old.configure(api_key=settings.GEMINI_API_KEY)
            self.genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def moderate_message(self, message: str) -> Dict[str, Any]:
        """Moderate a message for inappropriate content"""
        try:
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a content moderator for PeerLearn, an educational platform for students. 
                        Analyze the given message and determine if it contains inappropriate content.
                        Return a JSON response with:
                        - "is_appropriate": boolean (true if appropriate, false if inappropriate)
                        - "reason": string (brief explanation if inappropriate)
                        - "confidence": float (0.0 to 1.0)
                        
                        Consider inappropriate: harassment, bullying, spam, off-topic content, inappropriate language, 
                        personal attacks, or content not suitable for an educational environment."""
                    },
                    {
                        "role": "user",
                        "content": f"Moderate this message: '{message}'"
                    }
                ],
                temperature=0.1,
                max_tokens=150
            )
            
            result = response.choices[0].message.content
            # Parse the JSON response
            import json
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "is_appropriate": True,
                    "reason": "Unable to parse moderation result",
                    "confidence": 0.5
                }
                
        except Exception as e:
            logger.error(f"Error in message moderation: {e}")
            return {
                "is_appropriate": True,
                "reason": "Moderation service unavailable",
                "confidence": 0.0
            }

    async def summarize_chat(self, messages: List[Dict[str, Any]], room_name: str) -> str:
        """Summarize chat messages into study notes"""
        try:
            # Format messages for summarization
            formatted_messages = []
            for msg in messages:
                if not msg.get("deleted", False):
                    formatted_messages.append(f"{msg.get('sender_name', 'User')}: {msg.get('content', '')}")
            
            chat_text = "\n".join(formatted_messages[-50:])  # Last 50 messages
            
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an AI assistant helping students create study notes from their classroom discussions in the '{room_name}' room.
                        
                        Create a comprehensive summary that includes:
                        1. Key topics discussed
                        2. Important concepts and definitions
                        3. Questions raised and answers provided
                        4. Action items or follow-ups
                        5. Study recommendations
                        
                        Format the summary in a clear, organized manner suitable for study notes.
                        Focus on educational value and learning outcomes."""
                    },
                    {
                        "role": "user",
                        "content": f"Summarize this classroom discussion:\n\n{chat_text}"
                    }
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error in chat summarization: {e}")
            return "Unable to generate summary at this time. Please try again later."

    async def suggest_classroom_name(self, description: str) -> List[str]:
        """Suggest classroom names based on description"""
        try:
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an AI assistant helping students create engaging classroom names for their study groups.
                        Generate 5 creative, educational, and inspiring classroom names based on the given description.
                        Names should be:
                        - Relevant to the subject/topic
                        - Motivating and positive
                        - Easy to remember
                        - Professional but fun
                        
                        Return only the names, one per line, without numbering or bullet points."""
                    },
                    {
                        "role": "user",
                        "content": f"Suggest classroom names for: {description}"
                    }
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            suggestions = response.choices[0].message.content.strip().split('\n')
            return [s.strip() for s in suggestions if s.strip()][:5]
            
        except Exception as e:
            logger.error(f"Error in classroom name suggestion: {e}")
            return ["Study Group", "Learning Hub", "Knowledge Base", "Study Circle", "Academic Team"]

    async def suggest_room_names(self, classroom_name: str, subject: str) -> List[str]:
        """Suggest room names for a classroom"""
        try:
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an AI assistant helping students organize their '{classroom_name}' classroom with subject-specific rooms.
                        Generate 5 relevant room names for the subject: {subject}
                        
                        Room names should be:
                        - Subject-specific and relevant
                        - Clear and descriptive
                        - Encouraging collaboration
                        - Professional but engaging
                        
                        Examples: "General Discussion", "Study Notes", "Q&A Hub", "Resources", "Homework Help"
                        
                        Return only the names, one per line, without numbering or bullet points."""
                    },
                    {
                        "role": "user",
                        "content": f"Suggest room names for {subject} in {classroom_name}"
                    }
                ],
                temperature=0.6,
                max_tokens=150
            )
            
            suggestions = response.choices[0].message.content.strip().split('\n')
            return [s.strip() for s in suggestions if s.strip()][:5]
            
        except Exception as e:
            logger.error(f"Error in room name suggestion: {e}")
            return ["General Discussion", "Study Notes", "Q&A Hub", "Resources", "Homework Help"]

    async def generate_flashcards(self, short_summary: str, detailed_summary: str, video_title: str, count: int = 15) -> list:
        """Generate knowledge-testing flashcards from video summaries"""
        try:
            # Validate input summaries - be more lenient
            if not detailed_summary or len(detailed_summary.strip()) < 20:
                logger.warning(f"Detailed summary too short ({len(detailed_summary) if detailed_summary else 0} chars)")
                raise ValueError("Video summary is too short to generate meaningful flashcards")
            
            # Calculate suggested card count based on summary content richness
            word_count = len(detailed_summary.split())
            # More comprehensive: 1 card per 150 words for better coverage
            suggested_count = min(30, max(5, word_count // 150))
            
            logger.info(f"Generating knowledge-testing flashcards for video: {video_title} (summary: {word_count} words, suggested: {suggested_count})")
            
            # Combine summaries for comprehensive context
            combined_content = f"""QUICK OVERVIEW:
{short_summary or "No short summary available"}

DETAILED CONCEPTS:
{detailed_summary}"""
            
            # Truncate content if it's too long
            if len(combined_content) > 20000:
                combined_content = combined_content[:20000] + "...(truncated)"
                logger.info("Content truncated due to length")

            logger.info(f"Sending content to AI (length: {len(combined_content)} chars)")

            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert educational content creator. Create knowledge-testing flashcards from video content.

FLASHCARD TYPES:
1. Definition questions: "What is [concept]?" or "Define [term]"
2. Process questions: "How does [process] work?" or "Explain the steps of [method]"
3. Application questions: "When would you use [technique]?" or "What are the benefits of [approach]?"
4. Comparison questions: "What's the difference between [A] and [B]?"
5. Technical details: "What are the key components of [system]?"

REQUIREMENTS:
- Create specific questions based on the video content
- Focus on important concepts, definitions, and processes
- Make questions testable and educational
- Generate 8-20 flashcards depending on content
- Each flashcard needs: question, answer, explanation

OUTPUT FORMAT (JSON only):
{
  "flashcards": [
    {
      "question": "What is machine learning?",
      "answer": "A method that enables computers to learn from data without explicit programming.",
      "explanation": "Machine learning is fundamental to AI and allows systems to improve performance through experience."
    }
  ]
}"""
                    },
                    {
                        "role": "user",
                        "content": f"""Video: {video_title}

Content:
{combined_content}

Create educational flashcards based on the concepts in this content. Focus on specific, testable knowledge. Return only valid JSON."""
                    }
                ],
                temperature=0.3,
                max_tokens=3000,
                response_format={"type": "json_object"}
            )
            
            result = response.choices[0].message.content.strip()
            logger.info(f"AI response received (length: {len(result)})")
            logger.debug(f"Raw AI response: {result}")
            
            # Parse the JSON response
            import json
            try:
                # Clean up the response if needed
                if result.startswith("```json"):
                    result = result.replace("```json", "").replace("```", "").strip()
                if result.startswith("```"):
                    result = result.replace("```", "").strip()
                
                data = json.loads(result)
                logger.info(f"Successfully parsed JSON. Type: {type(data)}")
                
                # Extract flashcards
                flashcards = []
                if isinstance(data, dict) and "flashcards" in data:
                    flashcards = data["flashcards"]
                elif isinstance(data, list):
                    flashcards = data
                else:
                    # Try to find any list in the response
                    for key, value in data.items():
                        if isinstance(value, list) and len(value) > 0:
                            flashcards = value
                            break
                
                if not flashcards:
                    logger.error(f"No flashcards found in response: {data}")
                    raise ValueError("No flashcards found in AI response")

                # Validate and clean flashcards
                valid_flashcards = []
                for i, card in enumerate(flashcards):
                    try:
                        if isinstance(card, dict):
                            question = card.get("question", "").strip()
                            answer = card.get("answer", "").strip()
                            explanation = card.get("explanation", "").strip()
                            
                            if question and answer:
                                # Ensure explanation exists
                                if not explanation:
                                    explanation = "Review the video content for more details about this concept."
                                
                                valid_card = {
                                    "question": question,
                                    "answer": answer,
                                    "explanation": explanation
                                }
                                valid_flashcards.append(valid_card)
                                logger.debug(f"Valid flashcard {i+1}: {question[:50]}...")
                            else:
                                logger.warning(f"Flashcard {i+1} missing question or answer: {card}")
                        else:
                            logger.warning(f"Flashcard {i+1} is not a dict: {card}")
                    except Exception as card_error:
                        logger.warning(f"Error processing flashcard {i+1}: {card_error}")
                        continue
                
                if len(valid_flashcards) >= 1:  # Accept even 1 valid flashcard
                    logger.info(f"Successfully generated {len(valid_flashcards)} flashcards")
                    return valid_flashcards
                else:
                    logger.error(f"No valid flashcards generated from {len(flashcards)} raw cards")
                    raise ValueError("Failed to generate any valid flashcards")
                    
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                logger.error(f"Response was: {result[:500]}...")
                raise ValueError(f"AI returned invalid JSON: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in flashcard generation: {str(e)}")
            raise ValueError(f"Flashcard generation failed: {str(e)}")
    

    async def explain_flashcard_answer(self, question: str, answer: str, context: str, video_title: str) -> str:
        """Generate a detailed explanation for a flashcard answer based on video context"""
        try:
            logger.info(f"Generating explanation for flashcard question: {question[:50]}...")
            
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert educational tutor helping students master concepts from the video '{video_title}'.
                        
                        A student is studying with flashcards and needs a comprehensive explanation. Provide an educational explanation that:
                        
                        1. **Clarifies the Answer**: Explain the answer in simple, clear terms
                        2. **Provides Context**: Use specific examples and details from the video content
                        3. **Shows Connections**: Link this concept to related topics mentioned in the video
                        4. **Explains Importance**: Help the student understand WHY this concept matters
                        5. **Aids Memory**: Include memorable examples, analogies, or mnemonics when appropriate
                        6. **Encourages Application**: Suggest how this knowledge can be used or applied
                        
                        TEACHING APPROACH:
                        - Use clear, educational language appropriate for learning
                        - Break down complex concepts into understandable parts
                        - Provide specific examples from the video content
                        - Help the student see the bigger picture
                        - Encourage deeper thinking about the concept
                        
                        CRITICAL: Base your explanation entirely on the provided video context. Do not add information not present in the text."""
                    },
                    {
                        "role": "user",
                        "content": f"""Flashcard Question: {question}
Student's Answer to Review: {answer}

Video Context and Content:
{context}

Please provide a comprehensive educational explanation that helps the student understand this concept deeply, using specific information and examples from the video context above."""
                    }
                ],
                temperature=0.6,
                max_tokens=1000
            )
            
            explanation = response.choices[0].message.content.strip()
            logger.info("Generated comprehensive educational explanation successfully")
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating flashcard explanation: {e}")
            return f"""**Answer Explanation:**
{answer}

**Context:** This concept is discussed in the video '{video_title}'. 

**Study Tip:** Review the video transcript and summary for more detailed examples and context about this topic. Understanding the broader context will help you remember and apply this concept more effectively.

**Next Steps:** Try to think of real-world examples where this concept might apply, or how it connects to other topics you've learned."""

    async def generate_notes_from_document(self, content: str, document_title: str, user_prompt: str) -> str:
        """Generate structured notes from document content based on user prompt"""
        try:
            logger.info(f"Generating notes for document: {document_title}")
            
            # Truncate content if too long
            if len(content) > 15000:
                content = content[:15000] + "...(truncated)"
            
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert note-taking assistant for students. Your task is to help students create structured, comprehensive notes from their documents.

GUIDELINES:
- Create well-organized notes with clear headings and subheadings
- Use bullet points, numbered lists, and simple formatting for clarity
- Focus on key concepts, definitions, and important information
- Make notes concise but comprehensive
- Use PLAIN TEXT formatting only - no markdown symbols
- Include examples when relevant
- Organize information logically

FORMATTING RULES:
- Use simple text headings (no # symbols)
- Use - or * for bullet points (but keep it simple)
- Use CAPITAL LETTERS for emphasis instead of **bold**
- Use simple indentation for structure
- NO markdown symbols like #, **, `, >, etc.
- Keep formatting clean and readable

RESPONSE FORMAT:
Return only clean, plain text notes that are easy to read and edit in a simple text editor."""
                    },
                    {
                        "role": "user",
                        "content": f"""Document Title: {document_title}

User Request: {user_prompt}

Document Content:
{content}

Please generate clean, well-structured notes based on the user's request and the document content above. Use only plain text formatting - no markdown symbols."""
                    }
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            notes = response.choices[0].message.content.strip()
            
            # Clean up any remaining markdown symbols
            notes = self._clean_markdown_symbols(notes)
            
            logger.info("Successfully generated clean notes from document")
            return notes
            
        except Exception as e:
            logger.error(f"Error generating notes from document: {e}")
            return f"I apologize, but I encountered an error while generating notes: {str(e)}"

    def _clean_markdown_symbols(self, text: str) -> str:
        """Remove markdown symbols and clean up text formatting"""
        import re
        
        # Remove markdown headers
        text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
        
        # Remove bold/italic markers
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        text = re.sub(r'__(.*?)__', r'\1', text)
        text = re.sub(r'_(.*?)_', r'\1', text)
        
        # Remove code markers
        text = re.sub(r'`(.*?)`', r'\1', text)
        text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
        
        # Remove blockquote markers
        text = re.sub(r'^>\s*', '', text, flags=re.MULTILINE)
        
        # Clean up extra whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        text = text.strip()
        
        return text

    async def chat_with_document(self, content: str, document_title: str, user_message: str, chat_history: List[Dict] = None) -> str:
        """Chat with AI about the document content"""
        try:
            logger.info(f"Processing chat message for document: {document_title}")
            
            # Truncate content if too long
            if len(content) > 12000:
                content = content[:12000] + "...(truncated)"
            
            # Build conversation history
            messages = [
                {
                    "role": "system",
                    "content": f"""You are an AI assistant helping a student understand and work with their document titled "{document_title}".

DOCUMENT CONTEXT:
{content}

CAPABILITIES:
- Answer questions about the document content
- Explain concepts mentioned in the document
- Generate notes, summaries, or bullet points
- Help with understanding and analysis
- Suggest improvements or additions
- Create structured content based on the document

RESPONSE GUIDELINES:
- Base your responses on the document content provided
- Be helpful, educational, and encouraging
- Use clear, student-friendly language
- When generating content to be inserted, use PLAIN TEXT only - no markdown symbols
- If asked to create notes or summaries, make them clean and easy to read
- Keep responses conversational and helpful"""
                }
            ]
            
            # Add chat history if provided
            if chat_history:
                for msg in chat_history[-5:]:  # Last 5 messages for context
                    messages.append({"role": "user", "content": msg.get("message", "")})
                    messages.append({"role": "assistant", "content": msg.get("response", "")})
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=messages,
                temperature=0.4,
                max_tokens=1500
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Clean up any markdown symbols in the response
            ai_response = self._clean_markdown_symbols(ai_response)
            
            logger.info("Successfully generated clean chat response for document")
            return ai_response
            
        except Exception as e:
            logger.error(f"Error in document chat: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"

    async def generate_related_videos(self, short_summary: str, detailed_summary: str, video_title: str, count: int = 8) -> list:
        """Generate related YouTube video suggestions based on video content"""
        try:
            logger.info(f"Generating related videos for: {video_title}")
            
            # Validate input summaries
            if not detailed_summary or len(detailed_summary.strip()) < 20:
                logger.warning(f"Detailed summary too short ({len(detailed_summary) if detailed_summary else 0} chars)")
                raise ValueError("Video summary is too short to generate meaningful related videos")
            
            # Calculate suggested count based on content richness
            word_count = len(detailed_summary.split())
            suggested_count = min(10, max(5, word_count // 200))
            
            logger.info(f"Generating {suggested_count} related video suggestions for: {video_title}")
            
            # Combine summaries for comprehensive context
            combined_content = f"""VIDEO TITLE: {video_title}

QUICK OVERVIEW:
{short_summary or "No short summary available"}

DETAILED CONTENT:
{detailed_summary}"""
            
            # Truncate content if too long
            if len(combined_content) > 15000:
                combined_content = combined_content[:15000] + "...(truncated)"
                logger.info("Content truncated due to length")

            logger.info(f"Sending content to AI (length: {len(combined_content)} chars)")

            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert educational content curator. Generate related YouTube video suggestions based on the provided video content.

REQUIREMENTS:
- Create realistic YouTube video titles that would help students learn more about the topics
- Focus on educational content that complements the original video
- Include variety: tutorials, explanations, examples, advanced topics, and foundational concepts
- Make titles engaging and educational
- Suggest videos that would logically follow or supplement the learning journey
- Include both beginner-friendly and more advanced content
- Focus on practical applications and real-world examples

SUGGESTION TYPES:
1. Foundational concepts (if the video covers advanced topics)
2. Advanced applications (if the video covers basics)
3. Practical tutorials and examples
4. Related topics and concepts
5. Different perspectives on the same topic
6. Real-world applications
7. Case studies and examples
8. Complementary skills and knowledge

OUTPUT FORMAT (JSON only):
{
  "related_videos": [
    {
      "title": "Complete Beginner's Guide to Machine Learning in 2024",
      "description": "Perfect for understanding the fundamentals before diving deeper into advanced ML concepts",
      "category": "Foundational",
      "difficulty": "Beginner",
      "estimated_duration": "15-20 minutes",
      "why_relevant": "Provides essential background knowledge for better understanding of the original video's advanced concepts"
    }
  ]
}"""
                    },
                    {
                        "role": "user",
                        "content": f"""Based on this video content, suggest {suggested_count} related YouTube videos that would help students learn more about these topics:

{combined_content}

Generate educational video suggestions that would complement this content and help students in their exam preparation. Return only valid JSON."""
                    }
                ],
                temperature=0.4,
                max_tokens=2500,
                response_format={"type": "json_object"}
            )
            
            result = response.choices[0].message.content.strip()
            logger.info(f"AI response received (length: {len(result)})")
            logger.debug(f"Raw AI response: {result}")
            
            # Parse the JSON response
            import json
            try:
                # Clean up the response if needed
                if result.startswith("```json"):
                    result = result.replace("```json", "").replace("```", "").strip()
                if result.startswith("```"):
                    result = result.replace("```", "").strip()
                
                data = json.loads(result)
                logger.info(f"Successfully parsed JSON. Type: {type(data)}")
                
                # Extract related videos
                related_videos = []
                if isinstance(data, dict) and "related_videos" in data:
                    related_videos = data["related_videos"]
                elif isinstance(data, list):
                    related_videos = data
                else:
                    # Try to find any list in the response
                    for key, value in data.items():
                        if isinstance(value, list) and len(value) > 0:
                            related_videos = value
                            break
                
                if not related_videos:
                    logger.error(f"No related videos found in response: {data}")
                    raise ValueError("No related videos found in AI response")

                # Validate and clean related videos
                valid_videos = []
                for i, video in enumerate(related_videos):
                    try:
                        if isinstance(video, dict):
                            title = video.get("title", "").strip()
                            description = video.get("description", "").strip()
                            category = video.get("category", "Educational").strip()
                            difficulty = video.get("difficulty", "Intermediate").strip()
                            duration = video.get("estimated_duration", "10-15 minutes").strip()
                            relevance = video.get("why_relevant", "Complements the original video content").strip()
                            
                            if title and description:
                                # Ensure all fields exist
                                if not category:
                                    category = "Educational"
                                if not difficulty:
                                    difficulty = "Intermediate"
                                if not duration:
                                    duration = "10-15 minutes"
                                if not relevance:
                                    relevance = "Provides additional insights on the topic"
                                
                                valid_video = {
                                    "title": title,
                                    "description": description,
                                    "category": category,
                                    "difficulty": difficulty,
                                    "estimated_duration": duration,
                                    "why_relevant": relevance
                                }
                                valid_videos.append(valid_video)
                                logger.debug(f"Valid related video {i+1}: {title[:50]}...")
                            else:
                                logger.warning(f"Related video {i+1} missing title or description: {video}")
                        else:
                            logger.warning(f"Related video {i+1} is not a dict: {video}")
                    except Exception as video_error:
                        logger.warning(f"Error processing related video {i+1}: {video_error}")
                        continue
                
                if len(valid_videos) >= 1:  # Accept even 1 valid video
                    logger.info(f"Successfully generated {len(valid_videos)} related video suggestions")
                    return valid_videos
                else:
                    logger.error(f"No valid related videos generated from {len(related_videos)} raw suggestions")
                    raise ValueError("Failed to generate any valid related video suggestions")
                    
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                logger.error(f"Response was: {result[:500]}...")
                raise ValueError(f"AI returned invalid JSON: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in related videos generation: {str(e)}")
            raise ValueError(f"Related videos generation failed: {str(e)}")

    async def generate_slides_content(self, summary: str, count: int = 5) -> List[Dict[str, Any]]:
        """Generate structured content for slides based on summary"""
        try:
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert visual designer and educator. Create {count} slide visual descriptions based on the provided video summary.
                        
                        The goal is to generate a PROMPT for an AI image generator (like Gemini/Imagen) to create a FULL PRESENTATION SLIDE image.
                        The image itself should contain the text and the visual elements.
                        
                        For each slide, provide:
                        1. A catchy Title (for internal reference)
                        2. "image_prompt": A highly detailed prompt describing a presentation slide. 
                           - Specify the background (e.g., solid dark, gradient, abstract tech).
                           - Explicitly state the TEXT to appear on the slide (Title and max 3 short bullet points). 
                           - Describe the layout (e.g., Title at top, text on left, illustrative diagram on right).
                           - Use keywords like "high quality presentation slide", "modern UI", "infographic style", "4k", "clear text".
                        
                        Return ONLY a JSON array of objects:
                        [
                          {{
                            "title": "Title for Ref",
                            "image_prompt": "A modern presentation slide with a dark blue background. Title 'Introduction to AI' in bold white font at the top. Three bullet points: '1. Machine Learning basics', '2. Neural Networks', '3. Real-world apps'. On the right, a glowing brain circuit diagram. High resolution, professional design."
                          }}
                        ]"""
                    },
                    {
                        "role": "user",
                        "content": f"Summary:\n{summary}"
                    }
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            
            import json
            content = response.choices[0].message.content
            data = json.loads(content)
            
            if isinstance(data, dict) and "slides" in data:
                return data["slides"]
            if isinstance(data, list):
                return data
            # Fallback
            for key in data:
                if isinstance(data[key], list):
                    return data[key]
            
            return []
            
        except Exception as e:
            logger.error(f"Error generating slide content: {e}")
            raise

    async def generate_slide_image(self, prompt: str) -> bytes:
        """Generate an image using Gemini (Imagen) based on prompt"""
        try:
            # Using the new google-genai SDK 
            if not hasattr(self, 'genai_client'):
                self.genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)

            logger.info(f"Generating image with gemini-3-pro-image for prompt: {prompt[:30]}...")
            
            # Run synchronous generation in thread
            import asyncio
            response = await asyncio.to_thread(
                self.genai_client.models.generate_content,
                model="gemini-3-pro-image-preview",
                contents=prompt
            )
            
            # Extract image bytes from response
            for part in response.parts:
                if part.inline_data:
                    # part.inline_data.data is bytes
                    return part.inline_data.data
            
            logger.warning("No inline data (image) found in response.")
            return None
            
        except Exception as e:
            logger.error(f"Error generating slide image: {e}")
            # Return None to allow process to continue without image
            return None

    async def create_slides_pdf(self, slides_data: List[Dict[str, Any]], output_path: str):
        """Create a PDF presentation from slide data and generated images"""
        try:
            pw, ph = landscape(letter)
            
            # Define styles for fallback
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'SlideTitle',
                parent=styles['Title'],
                fontSize=24,
                spaceAfter=20,
                alignment=1
            )
            
            bullet_style = ParagraphStyle(
                'SlideBullet',
                parent=styles['Normal'],
                fontSize=14,
                leading=18,
                spaceAfter=5,
                leftIndent=20,
                bulletIndent=10
            )

            story = []

            for slide in slides_data:
                # Add Image (Full Page)
                if 'image_bytes' in slide and slide['image_bytes']:
                    try:
                        img_stream = io.BytesIO(slide['image_bytes'])
                        
                        # Add image fitting the page exactly
                        img = ReportLabImage(img_stream, width=pw, height=ph)
                        story.append(img)
                        story.append(PageBreak())
                        
                    except Exception as img_error:
                        logger.error(f"Failed to add image to PDF: {img_error}")
                        # Fallback text if image missing
                        story.append(Paragraph(f"Slide: {slide.get('title')}", title_style))
                        story.append(Paragraph("[Image Generation Failed]", bullet_style))
                        story.append(PageBreak())
                else:
                     # Fallback if no image bytes
                    story.append(Paragraph(slide.get('title', 'Untitled Slide'), title_style))
                    story.append(Paragraph("Image not available.", bullet_style))
                    story.append(PageBreak())
            
            # Use BaseDocTemplate for full control over frames/margins
            doc = BaseDocTemplate(output_path, pagesize=(pw, ph))
            
            # Create a full-page frame with no padding
            full_frame = Frame(
                x1=0, y1=0, width=pw, height=ph,
                id='normal',
                leftPadding=0, bottomPadding=0, rightPadding=0, topPadding=0,
                showBoundary=0
            )
            
            template = PageTemplate(id='normal', frames=[full_frame])
            doc.addPageTemplates([template])
            
            doc.build(story)
            return True
            
        except Exception as e:
            logger.error(f"Error creating slides PDF: {e}")
            raise

ai_service = AIService()

