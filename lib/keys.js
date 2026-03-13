const proxylist = require("./proxylist")

const keys = {
    athenaUrl : "https://cffw-apigql-prod2504180048.cf.px.athena.io/graphql",
    API_KEY:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  
    STRIPE_PUBLIC_KEY:'pk_live_51PL8Ki2MTuMr1tAf3yRyc8SDR0JNl3l7n3nDUoXq4pP9eSRnqmeJYxsaeZRpVibZ3pjAtGgcku07pJJOS18EO58e00xN7mUk4r',
    proxies:proxylist,
    DOMAIN_NAME : "https://paypost.axemahub.com",
    MAIN_DOMAIN_NAME : "https://payment.axcentrahub.com",
    AMOUNT:3000,
   
    SQUARE_LOCATION_ID:'LB8CZWYNHYWRP',
    CURRENT_PAYMENT_GATEWAY:'authorize', // 'stripe' or 'squareup' or 'paypal'
    IS_SANDBOX:false,
    SUCCESS_PAGE_DETAILS : {
        email:'payment@yrkgroup.com',
        phone:'+1 (201) 534-6549',
        company_name:'YRKBill.co',
    },
    AUTHORIZE:{
       
        PRODUCTION:{
            PUBLIC_CLIENT_KEY:'5EejFhs4KWPMa34857AaD7kF7UXzt359y5QB5ZssG9tGs4nfqqSPS3kx88r846W7',
            API_LOGIN_ID:'2u92VsW2r',
            TRANSACTION_KEY:'444t3Sty82qEbVZm',
            SIGNATURE_KEY:'DA280FFAC14D89D547B3FFA4DA55385864894227313FA17BF07F6432C2EBE7F967782D220E57C7B319CA7BA353C518AD434CC0287A6838C074D17386FD418F79'
        }
    },
     domains:{
        
        "za-x2":"https://payment.axcentrahub.com/",
        "if-x3":"https://xyz.com"
    }
}


module.exports = keys