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

    // The prompt is constructed using the userContext received from the client.
    // Modified to be extremely explicit about including HTML <a> tags.
    const prompt = `${userContext}

User question: ${message}

Your response MUST always include a brief, helpful summary related to the user's question.
If the user's question clearly relates to one of the specific website pages (Home, Safety, Dosage, Contact), you MUST, without exception, embed a direct, clickable HTML link to that page within your summary. The link MUST be a standard HTML <a> tag with an 'href' attribute pointing to the correct .html file.

Here are examples of the EXACT HTML link format to use. You MUST follow this format precisely:
- For Safety: <a href='safety.html'>Safety Page</a>
- For Dosage: <a href='dosage.html'>Dosage Page</a>
- For Contact: <a href='contact.html'>Contact Page</a>
- For Home/General: <a href='index.html'>Home Page</a>

Combine the summary and the HTML link naturally within the response.

Example response for "Please show the contact form":
"To contact us, please visit our <a href='contact.html'>Contact Page</a> where you will find our contact form, address, phone numbers, email addresses, business hours, and social media links. We're here to help! Remember to consult with healthcare professionals for personalized medical advice."

Your response should be concise and directly answer the user's question while adhering to the link format.
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
