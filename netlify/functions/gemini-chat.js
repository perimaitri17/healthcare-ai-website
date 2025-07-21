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

    // Updated prompt with stricter instructions and formatting
    const prompt = `${userContext}

User question: ${message}

=== Instructions ===
1. Provide a helpful, concise summary answering the user's question.
2. If the question clearly relates to a specific page (Home, Safety, Dosage, or Contact), include an HTML link to that page.
3. Use this exact format for links:
   - Safety: <a href='safety.html'>Safety Page</a>
   - Dosage: <a href='dosage.html'>Dosage Page</a>
   - Contact: <a href='contact.html'>Contact Page</a>
   - Home: <a href='index.html'>Home Page</a>
4. Combine the summary and the HTML link naturally in one paragraph.
5. Always include a note encouraging users to consult healthcare professionals for personalized medical advice.

=== Output Example ===
To get dosage instructions, please visit our <a href='dosage.html'>Dosage Page</a>. It contains dosage guidelines and recommendations. Always consult a healthcare professional for personalized medical advice.

==============================
Now write your answer below:
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
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
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

    const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!geminiText) {
      console.error('Unexpected API response structure from Gemini:', JSON.stringify(data, null, 2));
      throw new Error('Unexpected API response structure from Gemini.');
    }

    // Optional debug log
    console.log('Gemini response:', geminiText);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        response: geminiText
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
