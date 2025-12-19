from groq import Groq
from app.config import settings
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    async def moderate_message(self, message: str) -> Dict[str, Any]:
        """Moderate a message for inappropriate content"""
        try:
            response = self.client.chat.completions.create(
                model="llama3-8b-8192",
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
                model="llama3-8b-8192",
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
                model="llama3-8b-8192",
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
                model="llama3-8b-8192",
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

ai_service = AIService()

