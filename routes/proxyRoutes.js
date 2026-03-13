const express = require("express");
const keys = require("../lib/keys");
const router = express.Router();
const { default: axios } = require("axios");
const supabase = require("../utils/supabaseClient");
const { updateOrderStatus } = require("../lib/supabaseFunctions");


const athenaUrl = keys.athenaUrl;
/* axios.interceptors.request.use(config => {
    const proxy = getNextProxy();
    console.log(`Using proxy for request to ${config.url}: ${proxy}`);
    
    const proxyAgent = new HttpsProxyAgent(proxy);
    config.httpsAgent = proxyAgent;
    
    return config;
  }, error => {
    return Promise.reject(error);
  });
   */
  // Create a retry interceptor for failed requests
  /* axios.interceptors.response.use(response => {
    return response;
  }, async error => {
    const originalRequest = error.config;
    
    // Only retry once to avoid infinite loops
    if (!originalRequest._retry && (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET')) {
      originalRequest._retry = true;
      console.log('Proxy connection failed, trying next proxy...');
      
      // Get a new proxy
      const newProxy = getNextProxy();
      console.log(`Retrying with proxy: ${newProxy}`);
      
      originalRequest.httpsAgent = new HttpsProxyAgent(newProxy);
      return axios(originalRequest);
    }
    
    return Promise.reject(error);
  });
 */

  
  
  
  
async function fetchWithRetry(url, body, headers, maxRetries = 10, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to fetch ${url}`);
      const response = await axios.post(url, body, { headers });

      // If we receive a valid response, return it
      return response;
    } catch (error) {
      if (error.response?.status === 403) {
        console.warn(`403 Forbidden error on attempt ${attempt}. Retrying...`);
        if (attempt < maxRetries) await new Promise(res => setTimeout(res, delay)); // Wait before retrying
      } else {
        throw error; // If it's not a 403 error, throw it immediately
      }
    }
  }
  throw new Error("Max retries reached for fetching data.");
}


router.get('/summary/:uuid', async (req, res) => {
  console.log("Token request received");  
  const { uuid } = req.params;
  
  const {data,error} = await supabase.from('job_queue').select('*').eq('uuid',uuid).single();
  if(error || !data){
    console.error("Failed to get token from database");
    return res.render("failed");
  }

  console.log("Data fetched from database:", data);
  
  console.log(data?.data?.code?.data)
  res.render("summary", {
    data: data?.data?.code?.data,
    id: uuid,
    is_external: req.query.out == 1,
  });
});

router.get('/servicelist/:uuid', async (req, res) => {
  
  const { uuid } = req.params;
  const {data,error} = await supabase.from('job_queue').select('*').eq('uuid',uuid).single();

  if(error || !data){
    console.error("Failed to get token from database");
    return res.render("failed");
  }

  updateOrderStatus(uuid, 'navigated/servicelist');

  console.log("Data fetched from database:", data);
  res.render("servicelist", {
    data: data?.data?.code?.data,
    id: data.code,
    is_external: req.query.out == 1,
    uuid: uuid,
  });
});



router.get('/getBillStatus', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.error("No code provided");
    return res.status(400).send('No code provided');
  }

  // Set up SSE headers
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  // Function to send SSE message
  function sendStatusUpdate(payload) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  try {
    // Insert in job_queue table received coupon
    const { data: jobData, error: jobError } = await supabase
      .from('job_queue')
      .insert({
        code: code,
      })
      .select('*')
      .single();

    if (jobError) {
      console.error('Error inserting job:', jobError);
      sendStatusUpdate({ status: 'error', message: 'Error inserting job' });
      return res.end();
    }

    console.log('Job inserted:', jobData);

    const uuid = jobData.uuid;
    const startTime = Date.now();
    const maxWaitTime = 60000; // 1 minute in milliseconds
    const pollingInterval = 2000; // 2 seconds

    sendStatusUpdate({ status: 'inserted', message: 'Waiting for Bill Data' });

    // Function to check job status
    async function checkJobStatus() {
      try {
        const { data: job, error } = await supabase
          .from('job_queue')
          .select('id, status,code')
          .eq('uuid', uuid)
          .single();

        if (error) {
          console.error('Error fetching job status:', error);
          return { error: 'Error fetching job status' };
        }

        return { status: job?.status ?? 'unknown',code:job.code };
      } catch (error) {
        console.error('Database error:', error);
        return { error: 'Database error',code:null };
      }
    }

    // Polling function
    const poll = async () => {
      try {
        const result = await checkJobStatus();
        
        if (result.error) {
          sendStatusUpdate({ status: 'error', message: result.error });
          return res.end();
        }

        // Send status update
        sendStatusUpdate({ status: result.status });

        // If job is completed, close connection
        if (result.status === 'completed') {
            sendStatusUpdate({ status: result.status,redirectUrl: `${keys.DOMAIN_NAME}/summary/${uuid}` });
          console.log('Job completed, closing SSE connection');
          return res.end();
        }
        if(result.status === 'invalid'){
          sendStatusUpdate({ status: 'invalid', message: 'Invalid Code',redirectUrl: `${keys.MAIN_DOMAIN_NAME}/?invalid_code=1` });
          return res.end();
        }
        
        if(result.status === 'failed'){
          sendStatusUpdate({ status: 'failed', message: 'Job failed to complete',redirectUrl: `${keys.DOMAIN_NAME}/process-gate/${uuid}?code=${result.code}` });
          return res.end();
        }

        // Check if max wait time exceeded
        if (Date.now() - startTime >= maxWaitTime) {
          sendStatusUpdate({ status: 'failed', message: 'Job failed to complete',redirectUrl: `${keys.DOMAIN_NAME}/process-gate/${result.code}` });
          return res.end();
        }

        // Continue polling if not completed and not timed out
        setTimeout(poll, pollingInterval);
        
      } catch (error) {
        console.error('Polling error:', error);
        sendStatusUpdate({ status: 'error', message: 'Internal server error' });
        return res.end();
      }
    };

    // Send initial status and start polling
    const initialStatus = await checkJobStatus();
    
    if (initialStatus.error) {
      sendStatusUpdate({ status: 'error', message: initialStatus.error });
      return res.end();
    }

    // Send initial status
    sendStatusUpdate({ status: initialStatus.status });

    // If already completed, close immediately
    if (initialStatus.status === 'completed') {
      sendStatusUpdate({ status: initialStatus.status,redirectUrl: `/summary/${uuid}` });
      return res.end();
    }
    

    // Start polling
    setTimeout(poll, pollingInterval);
    
  } catch (error) {
    console.error('General error:', error);
    sendStatusUpdate({ status: 'error', message: 'Internal server error' });
    return res.end();
  }

  // Cleanup on client disconnect
  req.on('close', () => {
    console.log('Client disconnected');
  });
});










  

  module.exports = router