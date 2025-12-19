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

    async def generate_flashcards(self, short_summary: str, detailed_summary: str, video_title: str, count: int = 15) -> list:
        """Generate concept-focused flashcards from video summaries"""
        try:
            # Calculate suggested card count based on summary content richness
            word_count = len(detailed_summary.split())
            # More conservative: 1 card per 200 words, allowing AI to adjust based on content depth
            suggested_count = min(25, max(5, word_count // 200))
            
            logger.info(f"Generating flashcards for video: {video_title} (summary: {word_count} words, suggested: {suggested_count})")
            
            # Combine summaries for comprehensive context
            combined_content = f"""QUICK OVERVIEW:
{short_summary}

DETAILED CONCEPTS:
{detailed_summary}"""
            
            # Truncate content if it's too long
            if len(combined_content) > 25000:
                combined_content = combined_content[:25000] + "...(truncated)"

            response = self.client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are a strict educational assistant that extracts flashcards directly from text.

                        YOUR TASK: Convert the provided Video Summary into a set of flashcards.
                        
                        METHODOLOGY:
                        1. Read the summary text carefully.
                        2. Identify every specific concept, definition, term, or key insight mentioned.
                        3. For each one, create a flashcard where:
                           - The QUESTION asks about the concept (e.g., "What is [Concept]?", "How does [Process] work?", "What is the significance of [Term]?").
                           - The ANSWER is the specific definition or fact found in the text.
                           - The EXPLANATION provides the context, examples, or details found in the text.

                        RULES:
                        - Do NOT invent questions. Only ask about things explicitly defined in the summary.
                        - Do NOT use outside knowledge. Use ONLY the provided text.
                        - If the summary has a heading "What is a Neural Network?", create a card: Q: "What is a Neural Network?", A: [The text under that heading].
                        - Cover the entire summary, from start to finish.
                        - Generate between 10 and 30 cards depending on the amount of information.

                        OUTPUT FORMAT:
                        Return a valid JSON object with a single key "flashcards" containing the list of cards.
                        {{
                            "flashcards": [
                                {{
                                    "question": "What is a Neural Network?",
                                    "answer": "A complex system that enables computers to learn and make decisions based on data.",
                                    "explanation": "It is inspired by the human brain and composed of artificial neurons connected by synapses."
                                }},
                                ...
                            ]
                        }}
                        """
                    },
                    {
                        "role": "user",
                        "content": f"""Video Title: {video_title}

SUMMARY TEXT TO PROCESS:
{combined_content}

Extract all key concepts into flashcards based strictly on the text above. Return ONLY the JSON object."""
                    }
                ],
                temperature=0.3,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            result = response.choices[0].message.content.strip()
            
            # Parse the JSON response
            import json
            try:
                data = json.loads(result)
                # Handle both { "flashcards": [...] } and [...] formats
                if isinstance(data, dict) and "flashcards" in data:
                    flashcards = data["flashcards"]
                elif isinstance(data, list):
                    flashcards = data
                else:
                    # Try to find a list in the values
                    found = False
                    for key, value in data.items():
                        if isinstance(value, list):
                            flashcards = value
                            found = True
                            break
                    if not found:
                        raise ValueError("Could not find flashcards list in JSON response")

                # Validate the structure
                valid_flashcards = []
                for card in flashcards:
                    if all(key in card for key in ["question", "answer"]):
                        # Ensure explanation exists
                        if "explanation" not in card:
                            card["explanation"] = "See video summary for details."
                        valid_flashcards.append(card)
                
                if len(valid_flashcards) > 0:
                    logger.info(f"Successfully generated {len(valid_flashcards)} flashcards")
                    return valid_flashcards
                else:
                    logger.error("No valid flashcards found in response")
                    return self._generate_fallback_flashcards(video_title)
                    
            except Exception as e:
                logger.error(f"Failed to parse flashcards JSON: {e}")
                logger.error(f"Response was: {result}")
                return self._generate_fallback_flashcards(video_title)
                
        except Exception as e:
            logger.error(f"Error generating flashcards: {e}")
            return self._generate_fallback_flashcards(video_title)
    
    def _generate_fallback_flashcards(self, video_title: str) -> list:
        """Generate fallback flashcards when AI generation fails"""
        return [
            {
                "question": f"What is the main topic of '{video_title}'?",
                "answer": "The video covers fundamental principles and key ideas in this subject area.",
                "explanation": "This flashcard was automatically generated because the AI could not process the specific details. Please try regenerating the flashcards."
            },
            {
                "question": "What are the core principles explained in this video?",
                "answer": "Several important principles and theories are presented and explained.",
                "explanation": "Flashcard generation encountered an issue. Please regenerate for concept-focused study materials."
            },
            {
                "question": "What key terminology is introduced?",
                "answer": "Key terms and definitions form the foundation of understanding this topic.",
                "explanation": "Review the video summary to identify critical terminology and concepts."
            },
            {
                "question": "How can the concepts from this video be applied?",
                "answer": "The concepts have practical applications in various real-world contexts.",
                "explanation": "Consider real-world scenarios where this knowledge is relevant."
            },
            {
                "question": "What is the conclusion of the video?",
                "answer": "The video concludes by summarizing the main points and their significance.",
                "explanation": "Review the end of the video or the summary for the specific conclusion."
            }
        ]

    async def explain_flashcard_answer(self, question: str, answer: str, context: str, video_title: str) -> str:
        """Generate a detailed explanation for a flashcard answer based on video context"""
        try:
            logger.info(f"Generating explanation for flashcard question: {question[:50]}...")
            
            response = self.client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an educational AI tutor helping students understand concepts from the video '{video_title}'.
                        
                        A student is reviewing a flashcard and needs a detailed explanation. Provide a comprehensive explanation that:
                        1. Explains the answer using the SPECIFIC CONTEXT and EXAMPLES from the provided video content
                        2. Connects the concept to related topics mentioned in the text
                        3. Helps the student understand WHY this is important
                        4. Uses clear, educational language suitable for learning
                        
                        CRITICAL: Your explanation must be grounded in the provided video context. Do not hallucinate details not present in the text."""
                    },
                    {
                        "role": "user",
                        "content": f"""Question: {question}
Answer: {answer}

Video Context:
{context}

Please explain this answer in detail, using specific information and examples from the video context above."""
                    }
                ],
                temperature=0.6,
                max_tokens=800
            )
            
            explanation = response.choices[0].message.content.strip()
            logger.info("Generated detailed explanation successfully")
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating flashcard explanation: {e}")
            return f"The answer is: {answer}\n\nThis concept is discussed in the video '{video_title}'. For more details, please review the video transcript and summary."

ai_service = AIService()

