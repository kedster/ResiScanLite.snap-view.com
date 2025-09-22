// Cloudflare Pages Function for handling issue submissions
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Parse request body
    const issueData = await request.json();
    
    // Validate required fields
    if (!issueData.didItWork || !issueData.fileType || !issueData.fileSize) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create a record to store
    const record = {
      id: crypto.randomUUID(),
      ...issueData,
      submittedAt: new Date().toISOString()
    };
    
    // Store in KV (if available) or log for now
    if (env.ISSUE_REPORTS) {
      await env.ISSUE_REPORTS.put(record.id, JSON.stringify(record));
    }
    
    // Log the submission (will appear in Pages Functions logs)
    console.log('Issue submitted:', JSON.stringify(record, null, 2));
    
    return new Response(
      JSON.stringify({ success: true, id: record.id }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
    
  } catch (error) {
    console.error('Error processing issue submission:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}