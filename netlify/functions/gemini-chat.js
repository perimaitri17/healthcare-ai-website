exports.handler = async (event, context) => {
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
    // Ensure you are parsing the event body correctly
    const { message, context: userContext } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

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

    // The prompt is constructed using the userContext received from the client
    const prompt = `${userContext}\n\nUser question: ${message}`;

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
              text: prompt
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

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error from Gemini:', response.status, errorData);
      throw new Error(`Gemini API request failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Unexpected API response structure from Gemini:', JSON.stringify(data, null, 2));
      throw new Error('Unexpected API response structure from Gemini.');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
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
