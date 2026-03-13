const express = require("express");
const keys = require("../lib/keys");
const authenticate = require("../lib/authUtils");
const { getPaypalData, updateOrderStatus } = require("../lib/supabaseFunctions");
const { default: axios } = require("axios");
const supabase = require("../utils/supabaseClient");
const router = express.Router();

router.get("/api/host_url", authenticate, (req, res) => {
  res.json({ url: keys.athenaUrl });
});

router.get("/", (req, res) => {
  res.render("home2");
});


router.get('/check', (req, res) => {
    res.status(200).send('Server is up!');
});


router.get("/proceed", (req, res) => {
  res.render("failed");
});

router.get("/product", (req, res) => {
  res.render("product");
});

router.get("/productcheckout", (req, res) => {
  res.render("productcheckout");
});

router.get("/refund", (req, res) => {
  res.render("refund");
});

router.get("/login", (req, res) => {
  res.render("login");
});


router.get("/paycheckout", async(req, res) => {
  console.log("Checkout api called");
  const { param1, param2,uuid } = req.query;
  var amount = param1;

  var patientId = param2;
  const {data: orderData, error: orderError} = await supabase.from('orders').select('amount').eq('order_id', uuid).single();

  if (!orderError && orderData) {
    if (amount < orderData.amount) {
      await supabase.from('orders').update({ amount: amount }).eq('order_id', uuid);
    }
    
  }

  updateOrderStatus(uuid, 'navigated/checkout');
  res.render("checkoutPhone", { amount: amount, patientId: patientId, uuid: uuid });
});

router.get("/checkout", (req, res) => {
  res.render("checkout");
});

router.get("/privacy", (req, res) => {
  res.render("privacy2");
});

router.get("/successful/:uuid", async (req, res) => {
  const { uuid } = req.params;
  //get amount from orders table using uuid supabase

  let amount = 0;

  const {data,error} = await supabase.from('orders').select('amount').eq('order_id',uuid).single();
  if(error || !data){
    console.error("Failed to get amount from database", error);
    amount = 0;
  }
  else {
    console.log("Amount retrieved from database:", data);
    amount = data.amount;
  }
  
  res.render("successful-modern", {...keys.SUCCESS_PAGE_DETAILS,amount: amount });
});

router.get("/process-gate/:uuid", (req, res) => {
  const { uuid } = req.params;
  const {code } = req.query
  res.render("failed2", { code, uuid });
});

router.get('/loading/:code', (req, res) => {
  const { code } = req.params;
  res.render("loading", { code: code , domains: keys.domains});
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


router.get("/pay", async(req, res) => {


const { code, phone, amount } = req.query;
   
  



   const account = await getPaypalData(); 
           const formData = new FormData();
        
           formData.append('Phone', phone);
           formData.append('Pateint-Id', code);
       
           if(amount > keys.AMOUNT){
 
            formData.append('TransactionStatus','Initiated')
            /* await sendGoogleSheet(formData) */

            res.render('payment',{
              val: account, 
              amount, 
              patientId:code, 
              phoneNo: phone
            })
 
           }
           else{
            formData.append('TransactionStatus','Routed-Failed')
            await sendGoogleSheet(formData)
             res.render('payment-failed')
           }
           
 });



module.exports = router;
