exports.handler = async (event, context) => {
  // Ensure only POST requests are allowed for this function
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const { message, context: userContext } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    // Basic validation for API_KEY
    if (!API_KEY) {
      console.error('GEMINI_API_KEY environment variable is not set.');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Server configuration error: API key missing.' })
      };
    }

    // --- KEY CHANGE HERE: More explicit prompt for summary + HTML link ---
    const prompt = `${userContext}

User question: ${message}

Please provide a brief, helpful summary related to the user's question.
If the question is about a specific page (Home, Safety, Dosage, Contact), please include a direct HTML link to that page within your summary.
For example, if the user asks about Safety, your response should be like:
"Here's a quick overview of our safety protocols. You can find more details on our <a href='safety.html'>Safety Page</a>."
If the user asks about Contact, your response should be like:
"To contact us, please visit our <a href='contact.html'>Contact Page</a> where you will find our contact form, address, phone numbers, email addresses, business hours, and social media links. We're here to help!"
Always remember to emphasize that users should consult healthcare professionals for personalized medical advice.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt // Use the modified prompt here
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    // Check if the response is ok
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error from Gemini:', response.status, errorData);
      throw new Error(`Gemini API request failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    // Check if the response has the expected structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Unexpected API response structure from Gemini:', JSON.stringify(data, null, 2));
      throw new Error('Unexpected API response structure from Gemini.');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Add CORS headers if needed
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        response: data.candidates[0].content.parts[0].text
      })
    };

  } catch (error) {
    console.error('Netlify Function execution error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to process request by AI assistant.',
        details: error.message
      })
    };
  }
};
