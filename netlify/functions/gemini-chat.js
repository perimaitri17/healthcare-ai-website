exports.handler = async (event, context) => {
  const { message, context: userContext } = JSON.parse(event.body);
  const API_KEY = process.env.GEMINI_API_KEY;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${userContext}\n\nUser question: ${message}\n\nPlease provide a helpful healthcare-related response.` }]
          }]
        })
      }
    );
    
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process request' })
    };
  }
};
